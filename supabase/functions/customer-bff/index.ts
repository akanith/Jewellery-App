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
  const rawSecretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");

  let secretKey: string | undefined;
  if (rawSecretKeys) {
    try {
      const parsed = JSON.parse(rawSecretKeys);
      if (parsed && typeof parsed === "object" && parsed.default) {
        secretKey = parsed.default;
      }
    } catch {
      // Fallback ignored
    }
  }

  if (!secretKey) {
    secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (!supabaseUrl || !secretKey) {
    throw new Error("Missing required Supabase environment configuration.");
  }

  return createClient(supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

interface AuthenticatedSession {
  customerId: string;
  authenticatedRootId: string;
  fullName: string;
  customerCode: string;
}

/**
 * Authenticates bearer session token using SECURITY DEFINER RPC verify_customer_session.
 * Returns server-derived customer_id, authenticated_root_id, and metadata, or null if invalid/expired/revoked.
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
      authenticatedRootId: session.authenticated_root_id || session.customer_id,
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
  const password = body?.password;

  if (!rawMobile || typeof rawMobile !== "string") {
    return jsonResponse(
      { success: false, error: "Mobile number is required." },
      400
    );
  }

  if (!password || typeof password !== "string") {
    return jsonResponse(
      { success: false, error: "Password is required." },
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

    // Invoke customer_password_login RPC
    const { data: loginRes, error: loginErr } = await supabase.rpc("customer_password_login", {
      p_phone_number: normalizedMobile,
      p_password: password,
    });

    if (loginErr) {
      const errMsg = loginErr.message || "";
      if (errMsg.includes("LOCKED") || errMsg.includes("attempts")) {
        return jsonResponse(
          { success: false, error: "Too many unsuccessful attempts. Account is temporarily locked. Please try again later." },
          423
        );
      }
      return jsonResponse(
        { success: false, error: "Invalid mobile number or password." },
        401
      );
    }

    if (loginRes && loginRes.success === false) {
      if (loginRes.error === "ACCOUNT_LOCKED" || loginRes.status === "LOCKED") {
        return jsonResponse(
          { success: false, error: "Too many unsuccessful attempts. Account is temporarily locked. Please try again later." },
          423
        );
      }
      return jsonResponse(
        { success: false, error: loginRes.message || "Invalid mobile number or password." },
        401
      );
    }

    // Fetch all active customer profiles associated with this verified phone number
    const { data: customerRows, error: customerErr } = await supabase
      .from("customers")
      .select("id, customer_code, full_name, phone_number, created_at, customer_auth(password_status, locked_until), profiles!inner(is_active)")
      .eq("phone_number", normalizedMobile)
      .eq("profiles.is_active", true)
      .order("created_at", { ascending: true });

    if (customerErr || !customerRows || customerRows.length === 0) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid mobile number or customer account not active. Please contact Ramyas Jeweller.",
        },
        401
      );
    }

    // Determine target primary profile (matching login customer_id if returned by RPC, or first profile)
    const targetId = loginRes?.customer_id;
    const activeCustomer = customerRows.find((c) => c.id === targetId) || customerRows[0];

    // Filter profiles by explicit authorization returned by the security RPC
    const authorizedProfilesList = Array.isArray(loginRes?.profiles) ? loginRes.profiles : [];
    const authorizedIds = new Set<string>(
      authorizedProfilesList.map((p: any) => p.customer_id || p.customerId).filter(Boolean)
    );
    if (activeCustomer?.id) {
      authorizedIds.add(activeCustomer.id);
    }

    const filteredCustomerRows = customerRows.filter((c) => authorizedIds.has(c.id));

    const authRecord = Array.isArray(activeCustomer.customer_auth)
      ? activeCustomer.customer_auth[0]
      : activeCustomer.customer_auth;
    const pwdStatus = authRecord?.password_status || loginRes?.password_status || "ACTIVE";

    if (pwdStatus === "LOCKED") {
      return jsonResponse(
        { success: false, error: "Account is temporarily locked. Please try again later or contact showroom." },
        423
      );
    }

    // Fetch active schemes count only for authorized profiles
    const customerIds = filteredCustomerRows.map((c) => c.id);
    const { data: schemesData } = await supabase
      .from("schemes")
      .select("id, customer_id, status")
      .in("customer_id", customerIds)
      .in("status", ["ACTIVE", "COMPLETED", "MATURED", "PARTIALLY_REDEEMED"]);

    const schemeCountMap = new Map<string, number>();
    for (const s of schemesData || []) {
      schemeCountMap.set(s.customer_id, (schemeCountMap.get(s.customer_id) || 0) + 1);
    }

    const profiles = filteredCustomerRows.map((c) => {
      const cAuth = Array.isArray(c.customer_auth) ? c.customer_auth[0] : c.customer_auth;
      return {
        customerId: c.id,
        customerCode: c.customer_code,
        fullName: c.full_name,
        mobileNumber: c.phone_number,
        passwordStatus: cAuth?.password_status || "ACTIVE",
        schemeCount: schemeCountMap.get(c.id) || 0,
      };
    });

    const requiresSelection = profiles.length > 1;

    const rawToken = generateRawToken();
    const tokenHash = await hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error: rpcErr } = await supabase.rpc("create_customer_session", {
      p_customer_id: activeCustomer.id,
      p_authenticated_root_id: activeCustomer.id,
      p_token_hash: tokenHash,
      p_expires_at: expiresAt,
    });

    if (rpcErr) {
      console.error("RPC error during create_customer_session execution:", rpcErr);
      return jsonResponse(
        { success: false, error: "Unable to complete session creation." },
        500
      );
    }

    return jsonResponse({
      success: true,
      token: rawToken,
      requiresSelection,
      customer: {
        customerId: activeCustomer.id,
        customerCode: activeCustomer.customer_code,
        fullName: activeCustomer.full_name,
        mobileNumber: activeCustomer.phone_number,
        passwordStatus: pwdStatus,
        schemeCount: schemeCountMap.get(activeCustomer.id) || 0,
      },
      profiles,
    });
  } catch (err) {
    console.error("Login error:", err);
    return jsonResponse(
      { success: false, error: "An unexpected server error occurred." },
      500
    );
  }
}

/**
 * Handles POST /auth/change-password
 */
async function handleChangePassword(req: Request): Promise<Response> {
  const session = await authenticateSession(req);
  if (!session) {
    return jsonResponse({ success: false, error: "Unauthorized session." }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON request payload." }, 400);
  }

  const oldPassword =
    typeof body?.currentPassword === "string"
      ? body.currentPassword
      : typeof body?.oldPassword === "string"
      ? body.oldPassword
      : "";
  const newPassword = body?.newPassword;

  if (typeof newPassword !== "string" || !newPassword) {
    return jsonResponse({ success: false, error: "New password is required." }, 400);
  }

  // Validate password strength: min 8 chars, 1 letter, 1 number
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    return jsonResponse(
      { success: false, error: "Password must be at least 8 characters long and contain at least one letter and one number." },
      400
    );
  }

  try {
    const supabase = getSupabaseAdminClient();

    const { data: result, error } = await supabase.rpc("customer_change_password", {
      p_customer_id: session.customerId,
      p_old_password: typeof oldPassword === "string" ? oldPassword : "",
      p_new_password: newPassword,
    });

    if (error) {
      return jsonResponse(
        { success: false, error: error.message || "Failed to update password." },
        400
      );
    }

    if (result && result.success === false) {
      return jsonResponse(
        { success: false, error: result.error || result.message || "Current password is incorrect." },
        400
      );
    }

    return jsonResponse({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (err) {
    console.error("Change password error:", err);
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
 * Handles POST /auth/select-profile
 * Atomically switches the active customer profile of the session after verifying
 * that the target customer profile shares the same verified phone number.
 */
async function handleSelectProfile(req: Request): Promise<Response> {
  const session = await authenticateSession(req);
  if (!session) {
    return jsonResponse({ success: false, error: "Unauthorized session." }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON request payload." }, 400);
  }

  const targetCustomerId = body?.customerId;
  if (typeof targetCustomerId !== "string" || !targetCustomerId) {
    return jsonResponse({ success: false, error: "Customer profile ID is required." }, 400);
  }

  const rawToken = getBearerToken(req);
  if (!rawToken) {
    return jsonResponse({ success: false, error: "Authorization Bearer token required." }, 401);
  }

  try {
    const supabase = getSupabaseAdminClient();
    const tokenHash = await hashToken(rawToken);

    // 1. Attempt switch_customer_profile_session RPC
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("switch_customer_profile_session", {
      p_token_hash: tokenHash,
      p_target_customer_id: targetCustomerId,
    });

    if (!rpcErr && rpcRes && rpcRes.success) {
      return jsonResponse({
        success: true,
        customer: {
          customerId: rpcRes.customer_id,
          customerCode: rpcRes.customer_code,
          fullName: rpcRes.full_name,
          passwordStatus: rpcRes.password_status,
        },
      });
    }

    // 2. Direct fallback verification: Target profile MUST be in the same normalized mobile number group or explicitly authorized
    const rootId = session.authenticatedRootId || session.customerId;
    const isSelf = targetCustomerId === rootId;

    if (!isSelf) {
      // Check if both profiles belong to the same mobile group
      const { data: rootCust } = await supabase
        .from("customers")
        .select("phone_number")
        .eq("id", rootId)
        .single();

      const { data: targetCustCheck } = await supabase
        .from("customers")
        .select("phone_number")
        .eq("id", targetCustomerId)
        .single();

      const rootPhone = normalizeMobileNumber(rootCust?.phone_number || "");
      const targetPhone = normalizeMobileNumber(targetCustCheck?.phone_number || "");

      const isSameMobileGroup = rootPhone && targetPhone && rootPhone === targetPhone;

      if (!isSameMobileGroup) {
        const { data: authLink, error: authCheckErr } = await supabase
          .from("customer_profile_authorizations")
          .select("id")
          .eq("is_active", true)
          .or(`and(grantee_customer_id.eq.${rootId},grantor_customer_id.eq.${targetCustomerId}),and(grantor_customer_id.eq.${rootId},grantee_customer_id.eq.${targetCustomerId})`)
          .maybeSingle();

        if (authCheckErr || !authLink) {
          return jsonResponse(
            { success: false, error: "Security Violation: Unauthorized profile selection." },
            403
          );
        }
      }
    }

    // Fetch target customer profile and verify active status
    const { data: targetCust, error: targetErr } = await supabase
      .from("customers")
      .select("id, customer_code, full_name, phone_number, customer_auth(password_status)")
      .eq("id", targetCustomerId)
      .single();

    if (targetErr || !targetCust) {
      return jsonResponse(
        { success: false, error: "Security Violation: Customer profile not found." },
        404
      );
    }

    // Update customer session to point to the selected profile
    const { error: sessionUpdateErr } = await supabase
      .from("customer_sessions")
      .update({
        customer_id: targetCust.id,
        last_seen_at: new Date().toISOString(),
      })
      .eq("token_hash", tokenHash);

    if (sessionUpdateErr) {
      return jsonResponse({ success: false, error: "Failed to switch customer profile." }, 500);
    }

    const authRec = Array.isArray(targetCust.customer_auth)
      ? targetCust.customer_auth[0]
      : targetCust.customer_auth;

    return jsonResponse({
      success: true,
      customer: {
        customerId: targetCust.id,
        customerCode: targetCust.customer_code,
        fullName: targetCust.full_name,
        passwordStatus: authRec?.password_status || "ACTIVE",
      },
    });
  } catch (err) {
    console.error("Select profile error:", err);
    return jsonResponse({ success: false, error: "An unexpected server error occurred." }, 500);
  }
}

/**
 * Handles GET /auth/profiles
 * Retrieves all customer profiles explicitly authorized for the current session,
 * including all active customer registrations sharing the authenticated mobile number.
 */
async function handleGetProfiles(req: Request): Promise<Response> {
  const session = await authenticateSession(req);
  if (!session) {
    return jsonResponse({ success: false, error: "Unauthorized session." }, 401);
  }

  try {
    const supabase = getSupabaseAdminClient();
    const rootId = session.authenticatedRootId || session.customerId;

    // Fetch phone number of root customer
    const { data: rootCust } = await supabase
      .from("customers")
      .select("phone_number")
      .eq("id", rootId)
      .single();

    const cleanRootPhone = normalizeMobileNumber(rootCust?.phone_number || "");

    // Fetch all active profiles belonging to this phone number group
    let mobileGroupIds: string[] = [];
    if (cleanRootPhone) {
      const { data: samePhoneCusts } = await supabase
        .from("customers")
        .select("id, phone_number, profiles!inner(is_active)")
        .eq("profiles.is_active", true);

      mobileGroupIds = (samePhoneCusts || [])
        .filter((c: any) => normalizeMobileNumber(c.phone_number || "") === cleanRootPhone)
        .map((c: any) => c.id);
    }

    // 1. Fetch all profiles explicitly authorized for the authenticated root identity
    const { data: authLinks } = await supabase
      .from("customer_profile_authorizations")
      .select("grantor_customer_id, grantee_customer_id")
      .eq("is_active", true)
      .or(`grantee_customer_id.eq.${rootId},grantor_customer_id.eq.${rootId}`);

    const authorizedIds = new Set<string>([rootId, ...mobileGroupIds]);
    for (const link of authLinks || []) {
      if (link.grantor_customer_id) authorizedIds.add(link.grantor_customer_id);
      if (link.grantee_customer_id) authorizedIds.add(link.grantee_customer_id);
    }

    // 2. Fetch profile details strictly for authorized customer IDs
    const { data: customerRows, error: custErr } = await supabase
      .from("customers")
      .select("id, customer_code, full_name, phone_number, created_at, customer_auth(password_status), profiles!inner(is_active)")
      .in("id", Array.from(authorizedIds))
      .eq("profiles.is_active", true)
      .order("created_at", { ascending: true });

    if (custErr || !customerRows) {
      return jsonResponse({ success: false, error: "Failed to fetch customer profiles." }, 500);
    }

    // 3. Schemes count
    const customerIds = customerRows.map((c) => c.id);
    const { data: schemesData } = await supabase
      .from("schemes")
      .select("id, customer_id, status")
      .in("customer_id", customerIds)
      .in("status", ["ACTIVE", "COMPLETED", "MATURED", "PARTIALLY_REDEEMED"]);

    const schemeCountMap = new Map<string, number>();
    for (const s of schemesData || []) {
      schemeCountMap.set(s.customer_id, (schemeCountMap.get(s.customer_id) || 0) + 1);
    }

    const profiles = customerRows.map((c) => {
      const cAuth = Array.isArray(c.customer_auth) ? c.customer_auth[0] : c.customer_auth;
      return {
        customerId: c.id,
        customerCode: c.customer_code,
        fullName: c.full_name,
        mobileNumber: c.phone_number,
        passwordStatus: cAuth?.password_status || "ACTIVE",
        schemeCount: schemeCountMap.get(c.id) || 0,
        isSelected: c.id === session.customerId,
      };
    });

    return jsonResponse({
      success: true,
      profiles,
    });
  } catch (err) {
    console.error("Get profiles error:", err);
    return jsonResponse({ success: false, error: "An unexpected server error occurred." }, 500);
  }
}

/**
 * Handles POST /auth/forgot-password
 * Anti-account enumeration: Always returns generic success response.
 */
async function handleForgotPassword(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      {
        success: true,
        message: "If the mobile number is registered, a password reset request has been submitted. Please contact Ramyas Jeweller.",
      },
      200
    );
  }

  const rawMobile = typeof body?.mobileNumber === "string" ? body.mobileNumber : "";
  const normalizedMobile = normalizeMobileNumber(rawMobile);

  try {
    const supabase = getSupabaseAdminClient();

    // Call request_customer_password_reset RPC
    await supabase.rpc("request_customer_password_reset", {
      p_mobile_number: normalizedMobile,
    });
  } catch (err) {
    console.error("Forgot password request error:", err);
  }

  // Always return generic success message regardless of mobile existence
  return jsonResponse({
    success: true,
    message: "If the mobile number is registered, a password reset request has been submitted. Please contact Ramyas Jeweller.",
  });
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

    // 2. Fetch all schemes for the authenticated customer
    const OPEN_STATUSES = ["ACTIVE", "COMPLETED", "MATURED", "PARTIALLY_REDEEMED"];
    const { data: allSchemes, error: schemesError } = await supabase
      .from("schemes")
      .select("*")
      .eq("customer_id", session.customerId)
      .order("created_at", { ascending: false });

    if (schemesError) {
      console.error("Dashboard schemes query error:", schemesError);
      return jsonResponse({ success: false, error: "Failed to fetch customer schemes." }, 500);
    }

    const schemesList = allSchemes || [];
    const schemeIds = schemesList.map((s) => s.id);

    // 3. Fetch installments across all customer schemes
    let allInstallments: any[] = [];
    if (schemeIds.length > 0) {
      const { data: instData, error: instError } = await supabase
        .from("scheme_installments")
        .select("*")
        .in("scheme_id", schemeIds)
        .order("installment_number", { ascending: true });

      if (instError) {
        console.error("Dashboard installments query error:", instError);
        return jsonResponse({ success: false, error: "Failed to fetch installments." }, 500);
      }
      allInstallments = instData || [];
    }

    // 4. Fetch recent payments
    const { data: recentPayments, error: paymentsError } = await supabase
      .from("payments")
      .select("*")
      .eq("customer_id", session.customerId)
      .order("payment_date", { ascending: false })
      .limit(5);

    if (paymentsError) {
      console.error("Dashboard payments query error:", paymentsError);
    }

    // 5. Fetch unread notifications count
    const { count: unreadCount } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", session.customerId)
      .eq("is_read", false);

    // 6. Map each scheme into individual summary
    const mappedSchemes = schemesList.map((s, idx) => {
      const sInsts = allInstallments.filter((i) => i.scheme_id === s.id);
      const sPaidInsts = sInsts.filter((i) => i.status === "PAID").length;
      const sTotalInsts = s.total_installments || 12;
      const sPaidAmount = sInsts
        .filter((i) => i.status === "PAID")
        .reduce((sum, i) => sum + Number(i.paid_amount || i.installment_amount || 0), 0);
      const sTargetContribution = Number(s.target_contribution || 12000);
      const sRemainingContribution = Math.max(0, sTargetContribution - sPaidAmount);
      const sBonusAmount = Number(s.bonus_amount || 1000);
      const sMaturityAmount = Number(s.maturity_amount || 13000);
      const sProgressPercentage = Math.min(
        100,
        Math.round((sPaidInsts / sTotalInsts) * 100)
      );
      const sNextPending = sInsts.find((i) => i.status === "PENDING");

      return {
        schemeId: s.id,
        slotNumber: s.slot_number ?? (idx + 1),
        schemeName: "Ramyas Jeweller Savings Scheme",
        schemeCode: s.scheme_code,
        monthlyInstallmentAmount: Number(s.monthly_installment_amount || 1000),
        paidAmount: sPaidAmount,
        remainingContribution: sRemainingContribution,
        paidInstallments: sPaidInsts,
        totalInstallments: sTotalInsts,
        maturityAmount: sMaturityAmount,
        bonusAmount: sBonusAmount,
        maturityDate: formatMonthYear(s.end_month),
        progressPercentage: sProgressPercentage,
        status: s.status,
        currentInstallment: sNextPending
          ? {
              installmentNumber: sNextPending.installment_number,
              calendarMonth: formatMonthYear(sNextPending.calendar_month),
              dueDateFormatted: formatDateFormatted(sNextPending.due_date),
              amount: Number(sNextPending.installment_amount),
              status: sNextPending.status,
            }
          : null,
      };
    });

    // Determine primary scheme (first open scheme, or latest scheme)
    const primarySchemeSummary =
      mappedSchemes.find((m) => OPEN_STATUSES.includes(m.status)) ||
      mappedSchemes[0] ||
      null;

    const primaryNextPending = primarySchemeSummary?.currentInstallment || null;

    // 7. Calculate combined summary metrics across all schemes
    const activeSchemes = mappedSchemes.filter((m) => OPEN_STATUSES.includes(m.status));
    const combinedSummary = {
      totalSchemesCount: mappedSchemes.length,
      activeSchemesCount: activeSchemes.length,
      totalPaidAmount: mappedSchemes.reduce((sum, m) => sum + m.paidAmount, 0),
      totalTargetContribution: mappedSchemes.reduce(
        (sum, m) => sum + (m.paidAmount + m.remainingContribution),
        0
      ),
      totalRemainingContribution: mappedSchemes.reduce(
        (sum, m) => sum + m.remainingContribution,
        0
      ),
      totalMaturityAmount: mappedSchemes.reduce((sum, m) => sum + m.maturityAmount, 0),
      totalBonusAmount: mappedSchemes.reduce((sum, m) => sum + m.bonusAmount, 0),
      totalPaidInstallments: mappedSchemes.reduce((sum, m) => sum + m.paidInstallments, 0),
      totalInstallmentsCount: mappedSchemes.reduce((sum, m) => sum + m.totalInstallments, 0),
      overallProgressPercentage:
        mappedSchemes.length > 0
          ? Math.min(
              100,
              Math.round(
                (mappedSchemes.reduce((sum, m) => sum + m.paidInstallments, 0) /
                  Math.max(
                    1,
                    mappedSchemes.reduce((sum, m) => sum + m.totalInstallments, 0)
                  )) *
                  100
              )
            )
          : 0,
    };

    return jsonResponse({
      success: true,
      data: {
        customerName: customer.full_name,
        customerCode: customer.customer_code,
        mobileNumber: customer.phone_number,
        unreadNotificationsCount: unreadCount || 0,
        // Backward-compatible fields
        scheme: primarySchemeSummary,
        currentInstallment: primaryNextPending,
        // Multi-scheme additions
        schemes: mappedSchemes,
        summary: combinedSummary,
        recentPayments: (recentPayments || []).map((p) => ({
          id: p.receipt_number,
          calendarMonth: formatMonthYear(p.payment_date),
          amount: Number(p.amount),
          paymentDate: formatDateFormatted(p.payment_date),
          status: p.payment_status === "SUCCESS" ? "PAID" : p.payment_status,
        })),
        announcement: "Pay monthly at Ramya's Jeweller showroom to earn your 1-month completion bonus!",
        onlinePaymentConfigured: Boolean(
          Deno.env.get("RAZORPAY_KEY_ID") && Deno.env.get("RAZORPAY_KEY_SECRET")
        ),
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

  // 1. Parse and validate optional schemeId query parameter
  const url = new URL(req.url);
  const rawSchemeId = url.searchParams.get("schemeId") || url.searchParams.get("scheme_id");
  let requestedSchemeId: string | null = null;

  if (rawSchemeId !== null && rawSchemeId !== undefined) {
    const trimmed = rawSchemeId.trim();
    if (trimmed.length > 0) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(trimmed)) {
        return jsonResponse({ success: false, error: "Invalid scheme ID format." }, 400);
      }
      requestedSchemeId = trimmed;
    }
  }

  try {
    const supabase = getSupabaseAdminClient();

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, customer_code, full_name")
      .eq("id", session.customerId)
      .single();

    if (customerError || !customer) {
      return jsonResponse({ success: false, error: "Customer profile not found." }, 404);
    }

    // 2. Fetch targeted scheme, strictly enforcing customer ownership
    let scheme: any = null;

    if (requestedSchemeId) {
      // 2A. Explicit scheme requested: verify customer ownership regardless of open/closed status
      const { data: explicitScheme, error: schemeError } = await supabase
        .from("schemes")
        .select("*")
        .eq("id", requestedSchemeId)
        .eq("customer_id", session.customerId)
        .maybeSingle();

      if (schemeError) {
        console.error("Scheme query error:", schemeError);
        return jsonResponse({ success: false, error: "Failed to fetch scheme details." }, 500);
      }

      if (!explicitScheme) {
        return jsonResponse({ success: false, error: "Scheme not found." }, 404);
      }

      scheme = explicitScheme;
    } else {
      // 2B. Default selection: query most recently created eligible open scheme
      const OPEN_STATUSES = ["ACTIVE", "COMPLETED", "MATURED", "PARTIALLY_REDEEMED"];
      const { data: openScheme, error: openSchemeError } = await supabase
        .from("schemes")
        .select("*")
        .eq("customer_id", session.customerId)
        .in("status", OPEN_STATUSES)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openSchemeError) {
        console.error("Open scheme query error:", openSchemeError);
        return jsonResponse({ success: false, error: "Failed to fetch scheme details." }, 500);
      }

      if (openScheme) {
        scheme = openScheme;
      } else {
        // Fallback: If no eligible open scheme exists, check for most recent historical scheme
        const { data: latestAnyScheme, error: anySchemeError } = await supabase
          .from("schemes")
          .select("*")
          .eq("customer_id", session.customerId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (anySchemeError) {
          console.error("Historical scheme query error:", anySchemeError);
          return jsonResponse({ success: false, error: "Failed to fetch scheme details." }, 500);
        }

        scheme = latestAnyScheme;
      }
    }

    // 3. Fetch installments strictly for this scheme
    let installments: any[] = [];
    if (scheme) {
      const { data: instData, error: instError } = await supabase
        .from("scheme_installments")
        .select("*")
        .eq("scheme_id", scheme.id)
        .order("installment_number", { ascending: true });

      if (instError) {
        console.error("Installments query error:", instError);
        return jsonResponse({ success: false, error: "Failed to fetch installments." }, 500);
      }
      installments = instData || [];
    }

    // 4. Fetch payments strictly scoped to both customer_id AND scheme.id
    let payments: any[] = [];
    if (scheme) {
      const { data: payData, error: payError } = await supabase
        .from("payments")
        .select("*")
        .eq("customer_id", session.customerId)
        .eq("scheme_id", scheme.id);

      if (payError) {
        console.error("Payments query error:", payError);
        return jsonResponse({ success: false, error: "Failed to fetch payments." }, 500);
      }
      payments = payData || [];
    }

    // 5. Populate paymentMap scoped strictly to this scheme (no cross-scheme collisions)
    const paymentMap = new Map();
    payments.forEach((p) => {
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
        schemeId: scheme?.id || null,
        slotNumber: scheme?.slot_number ?? null,
        customerName: customer?.full_name || session.fullName,
        customerCode: customer?.customer_code || session.customerCode,
        schemeName: "Ramyas Jeweller Savings Scheme",
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
        onlinePaymentConfigured: Boolean(
          Deno.env.get("RAZORPAY_KEY_ID") && Deno.env.get("RAZORPAY_KEY_SECRET")
        ),
      },
    });
  } catch (err: unknown) {
    console.error("Passbook error:", err);
    return jsonResponse({ success: false, error: "Failed to fetch passbook data." }, 500);
  }
}

function maskPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length >= 4) {
    const last4 = cleaned.slice(-4);
    return `+91 ******${last4}`;
  }
  return phone;
}

/**
 * Handles GET /passbook/export
 * Strictly checks that:
 * 1. Customer is authenticated and authorized.
 * 2. Scheme belongs to the customer.
 * 3. Scheme has total_installments === 12.
 * 4. Exactly 12 installment records exist in scheme_installments for this scheme.
 * 5. ALL 12 installments have status === 'PAID'.
 * 6. Each paid installment has a corresponding canonical successful payment record (payment_status === 'SUCCESS').
 * If any condition fails, returns 403 PASSBOOK_NOT_COMPLETE with clear ineligibility details.
 * If all 12 are verified, returns authenticated passbook summary data for PDF generation.
 */
async function handlePassbookExport(req: Request): Promise<Response> {
  const session = await authenticateSession(req);
  if (!session) {
    return jsonResponse({ success: false, error: "Unauthorized session." }, 401);
  }

  // 1. Parse optional schemeId
  const url = new URL(req.url);
  const rawSchemeId = url.searchParams.get("schemeId") || url.searchParams.get("scheme_id");
  let requestedSchemeId: string | null = null;

  if (rawSchemeId !== null && rawSchemeId !== undefined) {
    const trimmed = rawSchemeId.trim();
    if (trimmed.length > 0) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(trimmed)) {
        return jsonResponse({ success: false, error: "Invalid scheme ID format." }, 400);
      }
      requestedSchemeId = trimmed;
    }
  }

  try {
    const supabase = getSupabaseAdminClient();

    // 2. Fetch customer details
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, customer_code, full_name, phone_number")
      .eq("id", session.customerId)
      .single();

    if (customerError || !customer) {
      return jsonResponse({ success: false, error: "Customer profile not found." }, 404);
    }

    // 3. Resolve scheme with strict customer ownership check
    let scheme: any = null;
    if (requestedSchemeId) {
      const { data: explicitScheme, error: schemeError } = await supabase
        .from("schemes")
        .select("*")
        .eq("id", requestedSchemeId)
        .eq("customer_id", session.customerId)
        .maybeSingle();

      if (schemeError) {
        console.error("Scheme query error:", schemeError);
        return jsonResponse({ success: false, error: "Failed to fetch scheme details." }, 500);
      }

      if (!explicitScheme) {
        return jsonResponse({ success: false, error: "Scheme not found." }, 404);
      }
      scheme = explicitScheme;
    } else {
      // If not specified, look for completed/active scheme belonging to this customer
      const { data: userSchemes, error: userSchemesError } = await supabase
        .from("schemes")
        .select("*")
        .eq("customer_id", session.customerId)
        .order("created_at", { ascending: false });

      if (userSchemesError) {
        return jsonResponse({ success: false, error: "Failed to fetch customer schemes." }, 500);
      }

      if (!userSchemes || userSchemes.length === 0) {
        return jsonResponse({ success: false, error: "No scheme found for this customer profile." }, 404);
      }

      // Prioritize completed or matured scheme, otherwise first scheme
      scheme = userSchemes.find((s: any) => s.status === "COMPLETED" || s.status === "MATURED") || userSchemes[0];
    }

    // 4. Fetch installments strictly for this scheme
    const { data: instData, error: instError } = await supabase
      .from("scheme_installments")
      .select("*")
      .eq("scheme_id", scheme.id)
      .order("installment_number", { ascending: true });

    if (instError) {
      return jsonResponse({ success: false, error: "Failed to fetch scheme installments." }, 500);
    }

    const installments = instData || [];
    const expectedTotal = scheme.total_installments || 12;

    // Check condition: Must be a 12-installment scheme and have 12 rows
    if (expectedTotal !== 12 || installments.length !== 12) {
      const paidCount = installments.filter((i) => i.status === "PAID").length;
      return jsonResponse(
        {
          success: false,
          error: "PASSBOOK_NOT_COMPLETE",
          message: `Passbook PDF is available only after completing all 12 installments (${paidCount}/12 paid).`,
          paidInstallments: paidCount,
          totalInstallments: 12,
        },
        403
      );
    }

    // 5. Check condition: All 12 installment records must have status === 'PAID'
    const unpaidInstallments = installments.filter((i) => i.status !== "PAID");
    if (unpaidInstallments.length > 0) {
      const paidCount = installments.filter((i) => i.status === "PAID").length;
      return jsonResponse(
        {
          success: false,
          error: "PASSBOOK_NOT_COMPLETE",
          message: `Passbook PDF is available only after completing all 12 installments (${paidCount}/12 paid).`,
          paidInstallments: paidCount,
          totalInstallments: 12,
        },
        403
      );
    }

    // 6. Fetch canonical payments scoped strictly to session.customerId AND scheme.id with payment_status = 'SUCCESS'
    const { data: payData, error: payError } = await supabase
      .from("payments")
      .select("*")
      .eq("customer_id", session.customerId)
      .eq("scheme_id", scheme.id)
      .eq("payment_status", "SUCCESS");

    if (payError) {
      return jsonResponse({ success: false, error: "Failed to verify payment ledger records." }, 500);
    }

    const successfulPayments = payData || [];

    // Map payments by installment_id and installment_number
    const paymentsByInstId = new Map<string, any>();
    const paymentsByInstNum = new Map<number, any>();

    successfulPayments.forEach((p) => {
      if (p.installment_id) {
        paymentsByInstId.set(p.installment_id, p);
      }
      if (p.installment_number) {
        paymentsByInstNum.set(p.installment_number, p);
      }
    });

    // Verify EVERY installment has a verified successful payment record
    const missingPaymentInsts: number[] = [];
    installments.forEach((inst) => {
      const match = paymentsByInstId.get(inst.id) || paymentsByInstNum.get(inst.installment_number);
      if (!match) {
        missingPaymentInsts.push(inst.installment_number);
      }
    });

    if (missingPaymentInsts.length > 0) {
      // One or more installments lack a verified canonical payment record
      const verifiedPaidCount = 12 - missingPaymentInsts.length;
      return jsonResponse(
        {
          success: false,
          error: "PASSBOOK_NOT_COMPLETE",
          message: `Passbook PDF is available only after completing all 12 installments. Unverified payment records found for installment(s): ${missingPaymentInsts.join(", ")}.`,
          paidInstallments: verifiedPaidCount,
          totalInstallments: 12,
        },
        403
      );
    }

    // All 12 installments verified with canonical payments!
    const verifiedInstallments = installments.map((inst) => {
      const paymentRecord = paymentsByInstId.get(inst.id) || paymentsByInstNum.get(inst.installment_number);
      return {
        installmentNumber: inst.installment_number,
        calendarMonth: formatMonthYear(inst.calendar_month),
        dueDateFormatted: formatDateFormatted(inst.due_date),
        paidDateFormatted: formatDateFormatted(inst.paid_date || paymentRecord?.payment_date),
        installmentAmount: Number(inst.installment_amount),
        paidAmount: Number(inst.paid_amount || paymentRecord?.amount || inst.installment_amount),
        status: "PAID",
        receiptNumber: paymentRecord?.receipt_number || `REC-${inst.installment_number}`,
        paymentMethod: paymentRecord?.payment_method || "CASH",
        paymentReference: paymentRecord?.payment_reference || paymentRecord?.id || "",
      };
    });

    const totalPaidAmount = verifiedInstallments.reduce((sum, i) => sum + i.paidAmount, 0);

    return jsonResponse({
      success: true,
      data: {
        customer: {
          fullName: customer.full_name,
          customerCode: customer.customer_code,
          phoneNumber: customer.phone_number,
          maskedPhoneNumber: maskPhoneNumber(customer.phone_number),
        },
        scheme: {
          schemeId: scheme.id,
          schemeCode: scheme.scheme_code,
          schemeName: "Ramyas Jeweller Savings Scheme",
          slotNumber: scheme.slot_number ?? 1,
          monthlyInstallmentAmount: Number(scheme.monthly_installment_amount || 1000),
          targetContribution: Number(scheme.target_contribution || 12000),
          totalPaidAmount,
          bonusAmount: Number(scheme.bonus_amount || 1000),
          maturityAmount: Number(scheme.maturity_amount || 13000),
          startMonth: formatMonthYear(scheme.start_month),
          endMonth: formatMonthYear(scheme.end_month),
          status: scheme.status,
          totalInstallments: 12,
          paidInstallments: 12,
        },
        installments: verifiedInstallments,
        generatedAt: new Date().toISOString(),
        generatedAtFormatted: formatDateFormatted(new Date().toISOString()),
        disclaimer: "This document is an authenticated digital passbook summary generated by Ramyas Jeweller based on confirmed canonical showroom and online ledger records.",
      },
    });
  } catch (err: unknown) {
    console.error("Passbook export error:", err);
    return jsonResponse({ success: false, error: "Failed to generate passbook export." }, 500);
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
          schemeBadge: "Ramyas Jeweller Savings Scheme",
          joinDate: formatDateFormatted(customer.created_at),
          address: fullAddress || "91, Main Road, Begambur, Dindigul - 624001",
          nominee: {
            name: customer.nominee_name || "Family Nominee",
            relationship: customer.nominee_relationship || "Nominee",
          },
        },
        currentScheme: {
          schemeName: "Ramyas Jeweller Savings Scheme",
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
          title: "Ramyas Jeweller Savings Scheme",
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
        schemeName: "Ramyas Jeweller Savings Scheme",
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
 * Handles POST /payment/initiate
 * Initiates an authenticated online payment attempt for the customer's due installment.
 */
async function handleInitiatePayment(req: Request): Promise<Response> {
  const session = await authenticateSession(req);
  if (!session) {
    return jsonResponse({ success: false, error: "Unauthorized session." }, 401);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const requestedSchemeId = typeof body.schemeId === "string" ? body.schemeId.trim() : null;
  const requestedInstallmentNumber = typeof body.installmentNumber === "number" ? body.installmentNumber : null;

  try {
    const supabase = getSupabaseAdminClient();

    // 1. Fetch authorized customer details
    const { data: customer, error: customerErr } = await supabase
      .from("customers")
      .select("id, customer_code, full_name, phone_number")
      .eq("id", session.customerId)
      .single();

    if (customerErr || !customer) {
      return jsonResponse({ success: false, error: "Customer record not found." }, 404);
    }

    // 2. Resolve Scheme strictly owned by this active customer profile
    let scheme: any = null;
    if (requestedSchemeId) {
      const { data: explicitScheme } = await supabase
        .from("schemes")
        .select("*")
        .eq("id", requestedSchemeId)
        .eq("customer_id", session.customerId)
        .maybeSingle();
      scheme = explicitScheme;
    } else {
      const { data: activeScheme } = await supabase
        .from("schemes")
        .select("*")
        .eq("customer_id", session.customerId)
        .in("status", ["ACTIVE", "COMPLETED"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      scheme = activeScheme;
    }

    if (!scheme) {
      return jsonResponse({ success: false, error: "Eligible active scheme not found." }, 404);
    }

    // 3. Resolve Installment: specific number or earliest pending
    let installment: any = null;
    if (requestedInstallmentNumber) {
      const { data: targetInst } = await supabase
        .from("scheme_installments")
        .select("*")
        .eq("scheme_id", scheme.id)
        .eq("installment_number", requestedInstallmentNumber)
        .maybeSingle();
      installment = targetInst;
    } else {
      const { data: pendingInst } = await supabase
        .from("scheme_installments")
        .select("*")
        .eq("scheme_id", scheme.id)
        .eq("status", "PENDING")
        .order("installment_number", { ascending: true })
        .limit(1)
        .maybeSingle();
      installment = pendingInst;
    }

    if (!installment) {
      return jsonResponse({ success: false, error: "No pending installment due for payment." }, 400);
    }

    if (installment.status === "PAID") {
      return jsonResponse(
        { success: false, error: `Installment #${installment.installment_number} is already paid.` },
        400
      );
    }

    // 3.1. Enforce Monthly Scheme Payment Limit (Asia/Kolkata calendar month)
    const { data: monthPayments } = await supabase
      .from("payments")
      .select("id, payment_date")
      .eq("scheme_id", scheme.id)
      .eq("payment_status", "SUCCESS");

    const nowKolkata = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
    }).format(new Date());

    const alreadyPaidThisMonth = monthPayments?.some((p) => {
      const pMonthKolkata = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
      }).format(new Date(p.payment_date));
      return pMonthKolkata === nowKolkata;
    });

    if (alreadyPaidThisMonth) {
      return jsonResponse(
        {
          success: false,
          error: "A payment has already been recorded for this scheme in the current calendar month.",
          code: "MONTHLY_LIMIT_EXCEEDED",
        },
        400
      );
    }

    // 4. Check if an active attempt for this installment was created within the last 15 minutes
    const { data: recentAttempt } = await supabase
      .from("payment_attempts")
      .select("*")
      .eq("scheme_id", scheme.id)
      .eq("installment_id", installment.id)
      .eq("status", "CREATED")
      .not("razorpay_payment_link_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (recentAttempt && new Date(recentAttempt.created_at) > fifteenMinutesAgo) {
      return jsonResponse({
        success: true,
        paymentAttemptId: recentAttempt.id,
        paymentLinkUrl: recentAttempt.razorpay_payment_link_url,
        amount: Number(recentAttempt.amount),
        amountPaise: recentAttempt.amount_paise,
        currency: recentAttempt.currency,
        installmentNumber: installment.installment_number,
        calendarMonth: formatMonthYear(installment.calendar_month),
        customerCode: customer.customer_code,
        reused: true,
      });
    }

    // 5. Generate internal payment attempt ID and metadata
    const attemptId = crypto.randomUUID();
    const amountInRupees = Number(installment.installment_amount || scheme.monthly_installment_amount || 1000.00);
    const amountPaise = Math.round(amountInRupees * 100);
    const currency = "INR";
    const dueMonthStr = formatMonthYear(installment.calendar_month);

    // 6. Razorpay API Call (credentials configured check)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const isLocalEnvironment = !supabaseUrl || supabaseUrl.includes("kong") || supabaseUrl.includes("127.0.0.1") || supabaseUrl.includes("localhost");

    const razorpayKeyId =
      (isLocalEnvironment ? req.headers.get("x-razorpay-key-id") : null) ||
      Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret =
      (isLocalEnvironment ? req.headers.get("x-razorpay-key-secret") : null) ||
      Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.warn("[Razorpay Config Notice] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not configured.");
      return jsonResponse(
        {
          success: false,
          error: "Online payments are currently unavailable. Razorpay payment gateway credentials are not configured on the server.",
          code: "PAYMENT_GATEWAY_NOT_CONFIGURED",
        },
        503
      );
    }

    let razorpayLinkId: string | null = null;
    let razorpayLinkUrl: string | null = null;

    const isMock = isLocalEnvironment && (razorpayKeyId.startsWith("rzp_test_mock") || req.headers.get("x-mock-razorpay") === "true");

    if (isMock) {
      const mockLinkId = `plink_test_${crypto.randomUUID().replace(/-/g, "").slice(0, 14)}`;
      razorpayLinkId = mockLinkId;
      razorpayLinkUrl = `https://rzp.io/i/${mockLinkId}`;
    } else {
      try {
        const credentials = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
        const rzpRes = await fetch("https://api.razorpay.com/v1/payment_links", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${credentials}`,
          },
          body: JSON.stringify({
            amount: amountPaise,
            currency: currency,
            accept_partial: false,
            reference_id: `RJ_ATT_${attemptId.slice(0, 8)}_${Date.now()}`,
            description: `Ramyas Jeweller - Installment #${installment.installment_number} (${dueMonthStr})`,
            customer: {
              name: customer.full_name,
              contact: customer.phone_number,
            },
            notify: {
              sms: false,
              email: false,
            },
            reminder_enable: false,
            notes: {
              payment_attempt_id: attemptId,
              customer_id: session.customerId,
              customer_code: customer.customer_code,
              scheme_id: scheme.id,
              installment_id: installment.id,
              installment_number: String(installment.installment_number),
            },
          }),
        });

        if (rzpRes.ok) {
          const rzpData = await rzpRes.json();
          razorpayLinkId = rzpData.id;
          razorpayLinkUrl = rzpData.short_url || rzpData.url;
        } else {
          const errText = await rzpRes.text();
          console.error("[Razorpay API] Failed to create payment link:", errText);
        }
      } catch (rzpErr) {
        console.error("[Razorpay API] Exception during payment link creation:", rzpErr);
      }
    }

    if (!razorpayLinkId || !razorpayLinkUrl) {
      return jsonResponse(
        {
          success: false,
          error: "Unable to create payment link with the payment gateway. Please try again or pay at our showroom counter.",
          code: "PAYMENT_LINK_CREATION_FAILED",
        },
        502
      );
    }

    // 7. Store payment attempt in database strictly associated with customer, scheme, installment
    const { error: insertErr } = await supabase
      .from("payment_attempts")
      .insert({
        id: attemptId,
        customer_id: session.customerId,
        scheme_id: scheme.id,
        installment_id: installment.id,
        installment_number: installment.installment_number,
        amount: amountInRupees,
        amount_paise: amountPaise,
        currency: currency,
        razorpay_payment_link_id: razorpayLinkId,
        razorpay_payment_link_url: razorpayLinkUrl,
        status: "CREATED",
        metadata: {
          calendar_month: installment.calendar_month,
          due_date: installment.due_date,
          customer_code: customer.customer_code,
          customer_name: customer.full_name,
        },
      });

    if (insertErr) {
      console.error("[Payment Attempt Insert Error]", insertErr);
      return jsonResponse({ success: false, error: "Failed to initialize payment attempt." }, 500);
    }

    return jsonResponse({
      success: true,
      paymentAttemptId: attemptId,
      paymentLinkUrl: razorpayLinkUrl,
      amount: amountInRupees,
      amountPaise: amountPaise,
      currency: currency,
      installmentNumber: installment.installment_number,
      calendarMonth: dueMonthStr,
      customerCode: customer.customer_code,
      reused: false,
    });
  } catch (err: unknown) {
    console.error("Initiate payment error:", err);
    return jsonResponse({ success: false, error: "Failed to initiate online payment." }, 500);
  }
}

/**
 * Handles GET /payment/status
 * Allows the customer app to poll/check status of a pending payment attempt.
 */
async function handlePaymentStatus(req: Request): Promise<Response> {
  const session = await authenticateSession(req);
  if (!session) {
    return jsonResponse({ success: false, error: "Unauthorized session." }, 401);
  }

  const url = new URL(req.url);
  const attemptId = url.searchParams.get("attemptId") || url.searchParams.get("attempt_id");

  try {
    const supabase = getSupabaseAdminClient();
    let attempt: any = null;

    if (attemptId) {
      // Fetch attempt strictly for this authenticated customer
      const { data, error: attemptErr } = await supabase
        .from("payment_attempts")
        .select("*")
        .eq("id", attemptId)
        .eq("customer_id", session.customerId)
        .maybeSingle();

      if (attemptErr || !data) {
        return jsonResponse({ success: false, error: "Payment attempt not found." }, 404);
      }
      attempt = data;
    } else {
      // Auto-recovery: Retrieve customer's most recent attempt created in the last 60 minutes
      const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: latestAttempt } = await supabase
        .from("payment_attempts")
        .select("*")
        .eq("customer_id", session.customerId)
        .gte("created_at", sixtyMinutesAgo)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latestAttempt) {
        return jsonResponse({ success: true, data: null });
      }
      attempt = latestAttempt;
    }

    // Check canonical payment record
    const { data: payment } = await supabase
      .from("payments")
      .select("id, receipt_number, amount, payment_date, payment_method, payment_status")
      .eq("installment_id", attempt.installment_id)
      .maybeSingle();

    // Check installment record
    const { data: installment } = await supabase
      .from("scheme_installments")
      .select("id, status, paid_date, paid_amount")
      .eq("id", attempt.installment_id)
      .maybeSingle();

    const isPaid = attempt.status === "PAID" || installment?.status === "PAID" || !!payment;

    return jsonResponse({
      success: true,
      data: {
        paymentAttemptId: attempt.id,
        status: isPaid ? "PAID" : attempt.status,
        isPaid,
        receiptNumber: payment?.receipt_number || null,
        paymentDate: payment?.payment_date ? formatDateFormatted(payment.payment_date) : null,
        amount: Number(attempt.amount),
        installmentNumber: attempt.installment_number,
      },
    });
  } catch (err: unknown) {
    console.error("Payment status error:", err);
    return jsonResponse({ success: false, error: "Failed to fetch payment status." }, 500);
  }
}

/**
 * Verifies Razorpay Webhook HMAC SHA256 Signature.
 */
async function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string | null
): Promise<boolean> {
  if (!signature || !secret) return false;
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const hmacBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
    const hmacHex = Array.from(new Uint8Array(hmacBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (hmacHex.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < hmacHex.length; i++) {
      diff |= hmacHex.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

/**
 * Handles POST /payment/webhook and POST /razorpay-webhook
 * Reconciles authoritative Razorpay events into canonical public.payments.
 */
async function handleRazorpayWebhook(req: Request): Promise<Response> {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || req.headers.get("X-Razorpay-Signature");
  const testSecretHeader = req.headers.get("x-razorpay-test-secret");
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const isLocalEnvironment = !supabaseUrl || supabaseUrl.includes("kong") || supabaseUrl.includes("127.0.0.1") || supabaseUrl.includes("localhost");

  // Authoritative secret resolution: reads RAZORPAY_WEBHOOK_SECRET, permitting test-mode secret only in local test environment
  const webhookSecret =
    Deno.env.get("RAZORPAY_WEBHOOK_SECRET") ||
    (isLocalEnvironment ? testSecretHeader || "local_dev_webhook_secret_31337" : null);

  if (!webhookSecret) {
    console.error("[Razorpay Webhook Error] RAZORPAY_WEBHOOK_SECRET is not configured on server.");
    return jsonResponse({ success: false, error: "Webhook secret is not configured on server." }, 500);
  }

  const isValid = await verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret);
  if (!isValid) {
    console.warn("[Razorpay Webhook] Invalid signature rejected.");
    return jsonResponse({ success: false, error: "Invalid webhook signature." }, 400);
  }

  let eventPayload: any;
  try {
    eventPayload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON payload." }, 400);
  }

  const eventType = eventPayload?.event;
  console.log(`[Razorpay Webhook] Processing authoritative event: ${eventType}`);

  if (eventType !== "payment_link.paid" && eventType !== "payment.captured") {
    return jsonResponse({ success: true, message: `Event ${eventType} acknowledged.` }, 200);
  }

  const paymentLink = eventPayload.payload?.payment_link?.entity;
  const paymentEntity = eventPayload.payload?.payment?.entity;

  const paymentLinkId = paymentLink?.id;
  const paymentId = paymentEntity?.id;
  const amountCaptured = paymentEntity?.amount ?? paymentLink?.amount_paid;
  const currency = paymentEntity?.currency ?? paymentLink?.currency ?? "INR";
  const rawMethod = paymentEntity?.method || "RAZORPAY";
  const notes = paymentLink?.notes || paymentEntity?.notes || {};
  const attemptId = notes.payment_attempt_id;

  if (!paymentId) {
    console.warn("[Razorpay Webhook] Event missing payment ID.");
    return jsonResponse({ success: false, error: "Missing payment ID in payload." }, 400);
  }

  const supabase = getSupabaseAdminClient();

  // 1. Resolve internal payment attempt
  let attempt: any = null;
  if (attemptId) {
    const { data } = await supabase
      .from("payment_attempts")
      .select("*")
      .eq("id", attemptId)
      .maybeSingle();
    attempt = data;
  }

  if (!attempt && paymentLinkId) {
    const { data } = await supabase
      .from("payment_attempts")
      .select("*")
      .eq("razorpay_payment_link_id", paymentLinkId)
      .maybeSingle();
    attempt = data;
  }

  if (!attempt) {
    console.warn(`[Razorpay Webhook] Unknown payment attempt. paymentId: ${paymentId}, linkId: ${paymentLinkId}`);
    return jsonResponse(
      { success: false, error: "Payment attempt not found or quarantined for manual review." },
      200
    );
  }

  // 2. Validate Currency and Amount
  if (currency !== "INR" || amountCaptured !== attempt.amount_paise) {
    console.warn(
      `[Razorpay Webhook] Currency/amount mismatch. Expected: ${attempt.amount_paise} INR, Got: ${amountCaptured} ${currency}`
    );
    await supabase
      .from("payment_attempts")
      .update({
        status: "FAILED",
        reconciliation_notes: `Amount/Currency mismatch. Expected ${attempt.amount_paise} INR, got ${amountCaptured} ${currency}.`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", attempt.id);

    return jsonResponse({ success: false, error: "Payment amount/currency mismatch." }, 200);
  }

  // 3. Normalize payment method
  let paymentMethod = "RAZORPAY";
  const normMethod = String(rawMethod).toUpperCase();
  if (["CASH", "GPAY", "PHONEPE", "BANK_TRANSFER", "UPI", "CARD", "RAZORPAY"].includes(normMethod)) {
    paymentMethod = normMethod;
  }

  // 4. Atomic Database Reconciliation RPC
  const { data: result, error: rpcErr } = await supabase.rpc("reconcile_online_payment", {
    p_payment_attempt_id: attempt.id,
    p_razorpay_payment_id: paymentId,
    p_captured_amount_paise: amountCaptured,
    p_payment_method: paymentMethod,
    p_gateway_fee_paise: paymentEntity?.fee ? Math.round(paymentEntity.fee) : null,
    p_notes: `Online Payment via Razorpay (${paymentId})`,
  });

  if (rpcErr) {
    console.error("[Razorpay Webhook Reconciliation Error]", rpcErr);
    return jsonResponse({ success: false, error: rpcErr.message }, 500);
  }

  return jsonResponse(
    {
      success: true,
      processed: true,
      result,
    },
    200
  );
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

  // Route: POST /auth/change-password
  if (path.endsWith("/auth/change-password")) {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed." }, 405);
    }
    return await handleChangePassword(req);
  }

  // Route: POST /auth/logout
  if (path.endsWith("/auth/logout")) {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed." }, 405);
    }
    return await handleLogout(req);
  }

  // Route: POST /auth/forgot-password
  if (path.endsWith("/auth/forgot-password")) {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed." }, 405);
    }
    return await handleForgotPassword(req);
  }

  // Route: POST /auth/select-profile
  if (path.endsWith("/auth/select-profile")) {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed." }, 405);
    }
    return await handleSelectProfile(req);
  }

  // Route: GET /auth/profiles
  if (path.endsWith("/auth/profiles")) {
    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed." }, 405);
    }
    return await handleGetProfiles(req);
  }


  // Protected Route: GET /dashboard
  if (path.endsWith("/dashboard")) {
    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed." }, 405);
    }
    return await handleDashboard(req);
  }

  // Protected Route: GET /passbook/export
  if (path.endsWith("/passbook/export")) {
    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed." }, 405);
    }
    return await handlePassbookExport(req);
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

  // Protected Route: POST /payment/initiate
  if (path.endsWith("/payment/initiate")) {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed." }, 405);
    }
    return await handleInitiatePayment(req);
  }

  // Protected Route: GET /payment/status
  if (path.endsWith("/payment/status")) {
    if (req.method !== "GET") {
      return jsonResponse({ success: false, error: "Method not allowed." }, 405);
    }
    return await handlePaymentStatus(req);
  }

  // Webhook Route: POST /payment/webhook or POST /razorpay-webhook
  if (path.endsWith("/payment/webhook") || path.endsWith("/razorpay-webhook")) {
    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed." }, 405);
    }
    return await handleRazorpayWebhook(req);
  }

  return jsonResponse({ success: false, error: "Endpoint not found." }, 404);
});
