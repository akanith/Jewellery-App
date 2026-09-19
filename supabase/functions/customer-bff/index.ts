import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * CORS headers for cross-origin requests from web and mobile runtimes.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function generateRawToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizeMobileNumber(input: string): string {
  let cleaned = input.replace(/\D/g, "");
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  }
  return cleaned;
}

function validateMobileNumber(mobile: string): boolean {
  return /^[6-9]\d{9}$/.test(mobile);
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader) return null;

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return null;
  }

  const token = parts[1].trim();
  if (!token || token.length < 32) {
    return null;
  }

  return token;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getSupabaseAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing required Supabase environment configuration.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

interface AuthenticatedSession {
  customerId: string;
  fullName: string;
  customerCode: string;
}

/**
 * Authenticates bearer session token using SECURITY DEFINER RPC verify_customer_session.
 * Returns server-derived customer_id and metadata, or null if invalid/expired/revoked.
 */
async function authenticateSession(req: Request): Promise<AuthenticatedSession | null> {
  const rawToken = getBearerToken(req);
  if (!rawToken) return null;

  try {
    const supabase = getSupabaseAdminClient();
    const tokenHash = await hashToken(rawToken);

    const { data, error } = await supabase.rpc("verify_customer_session", {
      p_token_hash: tokenHash,
    });

    if (error || !data || data.length === 0) {
      return null;
    }

    const session = data[0];
    if (!session || !session.customer_id) {
      return null;
    }

    return {
      customerId: session.customer_id,
      fullName: session.full_name,
      customerCode: session.customer_code,
    };
  } catch {
    return null;
  }
}

/**
 * Handles POST /auth/login
 */
async function handleLogin(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      { success: false, error: "Invalid JSON request payload." },
      400
    );
  }

  const rawMobile = body?.mobileNumber;
  if (!rawMobile || typeof rawMobile !== "string") {
    return jsonResponse(
      { success: false, error: "Mobile number is required." },
      400
    );
  }

  const normalizedMobile = normalizeMobileNumber(rawMobile);
  if (!validateMobileNumber(normalizedMobile)) {
    return jsonResponse(
      { success: false, error: "Please enter a valid 10-digit mobile number." },
      400
    );
  }

  try {
    const supabase = getSupabaseAdminClient();

    const { data: customer, error: customerErr } = await supabase
      .from("customers")
      .select("id, customer_code, full_name, phone_number, profiles!inner(is_active)")
      .eq("phone_number", normalizedMobile)
      .eq("profiles.is_active", true)
      .maybeSingle();

    if (customerErr) {
      console.error("Database query error during customer lookup.");
      return jsonResponse(
        { success: false, error: "Unable to process login. Please try again later." },
        500
      );
    }

    if (!customer) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid mobile number or customer account not active. Please contact Ramyas Jeweller.",
        },
        401
      );
    }

    const rawToken = generateRawToken();
    const tokenHash = await hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error: rpcErr } = await supabase.rpc("create_customer_session", {
      p_customer_id: customer.id,
      p_token_hash: tokenHash,
      p_expires_at: expiresAt,
    });

    if (rpcErr) {
      console.error("RPC error during create_customer_session execution.");
      return jsonResponse(
        { success: false, error: "Unable to complete session creation." },
        500
      );
    }

    return jsonResponse({
      success: true,
      token: rawToken,
      customer: {
        customerCode: customer.customer_code,
        fullName: customer.full_name,
        mobileNumber: customer.phone_number,
      },
    });
  } catch {
    return jsonResponse(
      { success: false, error: "An unexpected server error occurred." },
      500
    );
  }
}

/**
 * Handles POST /auth/logout
 */
async function handleLogout(req: Request): Promise<Response> {
  const rawToken = getBearerToken(req);
  if (!rawToken) {
    return jsonResponse(
      { success: false, error: "Authorization Bearer token required." },
      401
    );
  }

  try {
    const supabase = getSupabaseAdminClient();
    const tokenHash = await hashToken(rawToken);

    await supabase.rpc("revoke_customer_session", {
      p_token_hash: tokenHash,
    });

    return jsonResponse({
      success: true,
      message: "Logged out successfully.",
    });
  } catch {
    return jsonResponse(
      { success: true, message: "Logged out successfully." },
      200
    );
  }
}

/**
 * Helper to format date into readable month strings (e.g. "September 2026")
 */
function formatMonthYear(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatDateFormatted(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Handles GET /dashboard
 */
async function handleDashboard(req: Request): Promise<Response> {
  const session = await authenticateSession(req);
  if (!session) {
    return jsonResponse({ success: false, error: "Unauthorized session." }, 401);
  }

  try {
    const supabase = getSupabaseAdminClient();

    // 1. Fetch customer details
    const { data: customer } = await supabase
      .from("customers")
      .select("id, customer_code, full_name, phone_number")
      .eq("id", session.customerId)
      .single();

    if (!customer) {
      return jsonResponse({ success: false, error: "Customer profile not found." }, 404);
    }

    // 2. Fetch current active scheme
    const { data: scheme } = await supabase
      .from("schemes")
      .select("*")
      .eq("customer_id", session.customerId)
      .order("created_at", { ascending: false })
      .maybeSingle();

    // 3. Fetch installments for scheme
    let installments: any[] = [];
    if (scheme) {
      const { data: instData } = await supabase
        .from("scheme_installments")
        .select("*")
        .eq("scheme_id", scheme.id)
        .order("installment_number", { ascending: true });
      installments = instData || [];
    }

    // 4. Fetch recent payments
    const { data: recentPayments } = await supabase
      .from("payments")
      .select("*")
      .eq("customer_id", session.customerId)
      .order("payment_date", { ascending: false })
      .limit(5);

    // 5. Fetch unread notifications count
    const { count: unreadCount } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", session.customerId)
      .eq("is_read", false);

    // Calculate aggregated metrics
    const paidInstallments = installments.filter((i) => i.status === "PAID").length;
    const totalInstallments = scheme?.total_installments || 12;
    const paidAmount = installments
      .filter((i) => i.status === "PAID")
      .reduce((sum, i) => sum + Number(i.paid_amount || i.installment_amount || 0), 0);
    const targetContribution = Number(scheme?.target_contribution || 12000);
    const remainingContribution = Math.max(0, targetContribution - paidAmount);
    const bonusAmount = Number(scheme?.bonus_amount || 1000);
    const maturityAmount = Number(scheme?.maturity_amount || 13000);
    const progressPercentage = Math.min(
      100,
      Math.round((paidInstallments / totalInstallments) * 100)
    );

    const nextPending = installments.find((i) => i.status === "PENDING");

    return jsonResponse({
      success: true,
      data: {
        customerName: customer.full_name,
        customerCode: customer.customer_code,
        mobileNumber: customer.phone_number,
        unreadNotificationsCount: unreadCount || 0,
        scheme: scheme
          ? {
              schemeId: scheme.id,
              schemeName: "SWARNA LAKSHMI GOLD SAVINGS SCHEME",
              schemeCode: scheme.scheme_code,
              paidAmount,
              remainingContribution,
              paidInstallments,
              totalInstallments,
              maturityAmount,
              bonusAmount,
              maturityDate: formatMonthYear(scheme.end_month),
              progressPercentage,
              status: scheme.status,
            }
          : null,
        currentInstallment: nextPending
          ? {
              installmentNumber: nextPending.installment_number,
              calendarMonth: formatMonthYear(nextPending.calendar_month),
              dueDateFormatted: formatDateFormatted(nextPending.due_date),
              amount: Number(nextPending.installment_amount),
              status: nextPending.status,
            }
          : null,
        recentPayments: (recentPayments || []).map((p) => ({
          id: p.receipt_number,
          calendarMonth: formatMonthYear(p.payment_date),
          amount: Number(p.amount),
          paymentDate: formatDateFormatted(p.payment_date),
          status: p.payment_status === "SUCCESS" ? "PAID" : p.payment_status,
        })),
        announcement: "Pay monthly at Ramya's Jeweller showroom to earn your 1-month completion bonus!",
      },
    });
  } catch (err: unknown) {
    console.error("Dashboard error:", err);
    return jsonResponse({ success: false, error: "Failed to fetch dashboard data." }, 500);
  }
}

/**
 * Handles GET /passbook
 */
async function handlePassbook(req: Request): Promise<Response> {
  const session = await authenticateSession(req);
  if (!session) {
    return jsonResponse({ success: false, error: "Unauthorized session." }, 401);
  }

  try {
    const supabase = getSupabaseAdminClient();

    const { data: customer } = await supabase
      .from("customers")
      .select("id, customer_code, full_name")
      .eq("id", session.customerId)
      .single();

    const { data: scheme } = await supabase
      .from("schemes")
      .select("*")
      .eq("customer_id", session.customerId)
      .order("created_at", { ascending: false })
      .maybeSingle();

    let installments: any[] = [];
    if (scheme) {
      const { data: instData } = await supabase
        .from("scheme_installments")
        .select("*")
        .eq("scheme_id", scheme.id)
        .order("installment_number", { ascending: true });
      installments = instData || [];
    }

    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .eq("customer_id", session.customerId);

    const paymentMap = new Map();
    (payments || []).forEach((p) => {
      paymentMap.set(p.installment_number, p);
    });

    const paidInstallmentsCount = installments.filter((i) => i.status === "PAID").length;
    const paidAmountSum = installments
      .filter((i) => i.status === "PAID")
      .reduce((sum, i) => sum + Number(i.paid_amount || i.installment_amount || 0), 0);

    const formattedInstallments = installments.map((inst) => {
      const isPaid = inst.status === "PAID";
      const paymentRecord = paymentMap.get(inst.installment_number);

      return {
        installmentNumber: inst.installment_number,
        installmentLabel: `Installment ${inst.installment_number}`,
        calendarMonth: formatMonthYear(inst.calendar_month),
        installmentAmount: Number(inst.installment_amount),
        paidAmount: Number(inst.paid_amount || 0),
        status: inst.status,
        paidDateFormatted: isPaid && inst.paid_date ? `Paid on ${formatDateFormatted(inst.paid_date)}` : undefined,
        dueDateFormatted: !isPaid && inst.due_date ? `Due by ${formatDateFormatted(inst.due_date)}` : undefined,
        receiptNumber: paymentRecord?.receipt_number,
      };
    });

    return jsonResponse({
      success: true,
      data: {
        customerName: customer?.full_name || session.fullName,
        customerCode: customer?.customer_code || session.customerCode,
        schemeName: "SWARNA LAKSHMI GOLD SAVINGS SCHEME",
        schemeCode: scheme?.scheme_code || session.customerCode,
        financialYear: `FY ${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(2)}`,
        monthlyInstallment: Number(scheme?.monthly_installment_amount || 1000),
        paidAmount: paidAmountSum,
        totalContribution: Number(scheme?.target_contribution || 12000),
        paidInstallments: paidInstallmentsCount,
        totalInstallments: scheme?.total_installments || 12,
        status: scheme?.status || "ACTIVE",
        progressPercentage: Math.min(100, Math.round((paidInstallmentsCount / (scheme?.total_installments || 12)) * 100)),
        installments: formattedInstallments,
      },
    });
  } catch (err: unknown) {
    console.error("Passbook error:", err);
    return jsonResponse({ success: false, error: "Failed to fetch passbook data." }, 500);
  }
}

/**
 * Handles GET /profile
 */
async function handleProfile(req: Request): Promise<Response> {
  const session = await authenticateSession(req);
  if (!session) {
    return jsonResponse({ success: false, error: "Unauthorized session." }, 401);
  }

  try {
    const supabase = getSupabaseAdminClient();

    const { data: customer } = await supabase
      .from("customers")
      .select("*")
      .eq("id", session.customerId)
      .single();

    if (!customer) {
      return jsonResponse({ success: false, error: "Customer record not found." }, 404);
    }

    const { data: scheme } = await supabase
      .from("schemes")
      .select("*")
      .eq("customer_id", session.customerId)
      .order("created_at", { ascending: false })
      .maybeSingle();

    let paidInstallmentsCount = 0;
    let nextDueDateStr = "End of Month";

    if (scheme) {
      const { data: instData } = await supabase
        .from("scheme_installments")
        .select("installment_number, status, due_date")
        .eq("scheme_id", scheme.id);

      paidInstallmentsCount = (instData || []).filter((i) => i.status === "PAID").length;
      const nextPending = (instData || []).find((i) => i.status === "PENDING");
      if (nextPending?.due_date) {
        nextDueDateStr = formatDateFormatted(nextPending.due_date);
      }
    }

    const fullAddress = [customer.address, customer.city, customer.pincode]
      .filter(Boolean)
      .join(", ");

    return jsonResponse({
      success: true,
      data: {
        profile: {
          id: customer.customer_code,
          name: customer.full_name,
          mobileNumber: `+91 ${customer.phone_number}`,
          alternatePhone: customer.alternate_phone ? `+91 ${customer.alternate_phone}` : undefined,
          schemeBadge: "SWARNA LAKSHMI SCHEME",
          joinDate: formatDateFormatted(customer.created_at),
          address: fullAddress || "91, Main Road, Begambur, Dindigul - 624001",
          nominee: {
            name: customer.nominee_name || "Family Nominee",
            relationship: customer.nominee_relationship || "Nominee",
          },
        },
        currentScheme: {
          schemeName: "SWARNA LAKSHMI GOLD SAVINGS SCHEME",
          monthlyInstallment: Number(scheme?.monthly_installment_amount || 1000),
          totalMonths: scheme?.total_installments || 12,
          paidInstallments: paidInstallmentsCount,
          nextPaymentDue: nextDueDateStr,
        },
      },
    });
  } catch (err: unknown) {
    console.error("Profile error:", err);
    return jsonResponse({ success: false, error: "Failed to fetch profile data." }, 500);
  }
}

/**
 * Handles GET /notifications
 */
async function handleNotifications(req: Request): Promise<Response> {
  const session = await authenticateSession(req);
  if (!session) {
    return jsonResponse({ success: false, error: "Unauthorized session." }, 401);
  }

  try {
    const supabase = getSupabaseAdminClient();

    const { data: notifications } = await supabase
      .from("notifications")
      .select("*")
      .eq("customer_id", session.customerId)
      .order("created_at", { ascending: false });

    const unreadCount = (notifications || []).filter((n) => !n.is_read).length;

    const formattedNotifications = (notifications || []).map((n) => {
      const createdDate = new Date(n.created_at);
      const now = new Date();
      const diffHours = Math.abs(now.getTime() - createdDate.getTime()) / 36e5;

      let section: "TODAY" | "THIS_WEEK" | "EARLIER" = "EARLIER";
      if (diffHours < 24) {
        section = "TODAY";
      } else if (diffHours < 168) {
        section = "THIS_WEEK";
      }

      return {
        id: n.id,
        category: n.notification_type || "PAYMENT_RECORDED",
        title: n.title,
        message: n.message,
        timestamp: formatDateFormatted(n.created_at),
        section,
        isRead: n.is_read,
      };
    });

    return jsonResponse({
      success: true,
      data: {
        unreadCount,
        featuredBanner: {
          id: "b1",
          title: "Swarna Lakshmi Gold Savings",
          subtitle: "Pay 11 installments & get the 12th installment as 100% shop bonus at maturity!",
        },
        notifications: formattedNotifications,
      },
    });
  } catch (err: unknown) {
    console.error("Notifications error:", err);
    return jsonResponse({ success: false, error: "Failed to fetch notifications." }, 500);
  }
}

/**
 * Handles POST /notifications/read
 */
async function handleMarkNotificationRead(req: Request): Promise<Response> {
  const session = await authenticateSession(req);
  if (!session) {
    return jsonResponse({ success: false, error: "Unauthorized session." }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON request body." }, 400);
  }

  const notificationId = body?.notificationId;
  if (!notificationId || typeof notificationId !== "string") {
    return jsonResponse({ success: false, error: "notificationId string is required." }, 400);
  }

  try {
    const supabase = getSupabaseAdminClient();

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("customer_id", session.customerId); // Scoped strictly to authenticated customer

    if (error) {
      console.error("Error marking notification read:", error);
      return jsonResponse({ success: false, error: "Failed to update notification." }, 500);
    }

    return jsonResponse({ success: true, message: "Notification marked as read." });
  } catch {
    return jsonResponse({ success: false, error: "Failed to update notification." }, 500);
  }
}

/**
 * Handles GET /receipt?receiptNumber=... or GET /receipt/:receiptNumber
 * Returns receipt ONLY if it belongs to authenticated customer.
 */
async function handleReceipt(req: Request): Promise<Response> {
  const session = await authenticateSession(req);
  if (!session) {
    return jsonResponse({ success: false, error: "Unauthorized session." }, 401);
  }

  const url = new URL(req.url);
  let receiptNumber = url.searchParams.get("receiptNumber");

  if (!receiptNumber) {
    const pathParts = url.pathname.split("/").filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && lastPart !== "receipt") {
      receiptNumber = lastPart;
    }
  }

  if (!receiptNumber) {
    return jsonResponse({ success: false, error: "Receipt number is required." }, 400);
  }

  try {
    const supabase = getSupabaseAdminClient();

    // Query payment scoped strictly to customer_id = session.customerId
    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("receipt_number", receiptNumber)
      .eq("customer_id", session.customerId) // STRICT ISOLATION
      .maybeSingle();

    if (!payment) {
      // Generic 404 error prevents leaking whether receipt belongs to another customer
      return jsonResponse({ success: false, error: "Receipt not found." }, 404);
    }

    const { data: customer } = await supabase
      .from("customers")
      .select("customer_code, full_name")
      .eq("id", session.customerId)
      .single();

    const { data: scheme } = await supabase
      .from("schemes")
      .select("scheme_code, total_installments, target_contribution, bonus_amount")
      .eq("id", payment.scheme_id)
      .single();

    const { data: allInstallments } = await supabase
      .from("scheme_installments")
      .select("status, paid_amount, calendar_month")
      .eq("scheme_id", payment.scheme_id);

    const paidTotal = (allInstallments || [])
      .filter((i) => i.status === "PAID")
      .reduce((sum, i) => sum + Number(i.paid_amount || 1000), 0);

    const totalTarget = Number(scheme?.target_contribution || 12000);
    const remainingContribution = Math.max(0, totalTarget - paidTotal);
    const totalInstallmentsCount = scheme?.total_installments || 12;
    const isCompleted = payment.installment_number >= totalInstallmentsCount;

    const nextInst = (allInstallments || []).find(
      (i) => i.status === "PENDING"
    );

    return jsonResponse({
      success: true,
      data: {
        receiptNumber: payment.receipt_number,
        customerName: customer?.full_name || session.fullName,
        customerId: customer?.customer_code || session.customerCode,
        schemeName: "SWARNA LAKSHMI GOLD SAVINGS SCHEME",
        installmentNumber: payment.installment_number,
        totalInstallments: totalInstallmentsCount,
        installmentAmount: Number(payment.amount),
        paymentDate: formatDateFormatted(payment.payment_date),
        paymentMethod: payment.payment_method || "CASH",
        collectedAt: "Ramya's Jeweller Showroom",
        collectedBy: "Authorized Admin",
        paidTotal,
        remainingContribution,
        bonusAmount: Number(scheme?.bonus_amount || 1000),
        isSchemeCompleted: isCompleted,
        nextInstallmentMonth: nextInst ? formatMonthYear(nextInst.calendar_month) : "Completed",
      },
    });
  } catch (err: unknown) {
    console.error("Receipt error:", err);
    return jsonResponse({ success: false, error: "Failed to fetch receipt." }, 500);
  }
}

/**
 * Main HTTP Server Request Dispatcher
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "");

  // Route: POST /auth/login
  if (path.endsWith("/auth/login")) {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed." }, 405);
    }
    return await handleLogin(req);
  }

  // Route: POST /auth/logout
  if (path.endsWith("/auth/logout")) {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed." }, 405);
    }
    return await handleLogout(req);
  }

  // Protected Route: GET /dashboard
  if (path.endsWith("/dashboard")) {
    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed." }, 405);
    }
    return await handleDashboard(req);
  }

  // Protected Route: GET /passbook
  if (path.endsWith("/passbook")) {
    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed." }, 405);
    }
    return await handlePassbook(req);
  }

  // Protected Route: GET /profile
  if (path.endsWith("/profile")) {
    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed." }, 405);
    }
    return await handleProfile(req);
  }

  // Protected Route: GET /notifications
  if (path.endsWith("/notifications")) {
    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed." }, 405);
    }
    return await handleNotifications(req);
  }

  // Protected Route: POST /notifications/read
  if (path.endsWith("/notifications/read")) {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed." }, 405);
    }
    return await handleMarkNotificationRead(req);
  }

  // Protected Route: GET /receipt or GET /receipt/:id
  if (path.includes("/receipt")) {
    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed." }, 405);
    }
    return await handleReceipt(req);
  }

  return jsonResponse({ success: false, error: "Endpoint not found." }, 404);
});
