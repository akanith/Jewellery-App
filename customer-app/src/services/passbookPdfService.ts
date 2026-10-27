import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { getPassbookExportData, PassbookExportResult } from './customerDataService';
import { buildPassbookHtml } from './passbookHtmlBuilder';

export { buildPassbookHtml };

export interface ExportPdfResult {
  success: boolean;
  uri?: string;
  error?: string;
  message?: string;
  paidInstallments?: number;
  totalInstallments?: number;
}

/**
 * Main export function:
 * 1. Calls authenticated BFF export endpoint.
 * 2. Strictly enforces that 12/12 installments are paid & verified.
 * 3. Generates genuine PDF with Base64 via expo-print (bypasses Android Print-cache URI reading).
 * 4. Writes Base64 PDF directly into app's own cacheDirectory using legacy writeAsStringAsync.
 * 5. Verifies written file exists and has non-zero size.
 * 6. Triggers Android / iOS native share dialog with app-owned destination URI.
 */
export async function exportPassbookPdf(
  schemeId?: string,
  lang: 'en' | 'ta' = 'en'
): Promise<ExportPdfResult> {
  // Step 1: Check server-side eligibility and fetch verified canonical passbook data
  const result: PassbookExportResult = await getPassbookExportData(schemeId);

  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error || 'PASSBOOK_NOT_COMPLETE',
      message: result.message || 'Passbook PDF is only available for fully completed schemes.',
      paidInstallments: result.paidInstallments ?? 0,
      totalInstallments: result.totalInstallments ?? 12,
    };
  }

  const exportData = result.data;

  // Step 2: Build HTML with robust styling and Tamil font support
  const html = buildPassbookHtml(exportData, lang);

  // Step 3: Compute clean, descriptive, sanitized filename
  const cleanCustomerCode = (exportData.customer.customerCode || 'RJ-CUST').replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanSchemeCode = (exportData.scheme.schemeCode || 'SCHEME').replace(/[^a-zA-Z0-9_-]/g, '');
  const targetFileName = `Ramyas-Jeweller-Passbook-${cleanCustomerCode}-${cleanSchemeCode}.pdf`;

  // Step 4: Web fallback
  if (Platform.OS === 'web') {
    try {
      await Print.printAsync({ html });
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: 'PRINT_FAILED',
        message: err?.message || 'Failed to open print dialog.',
      };
    }
  }

  // Step 5: Native Mobile PDF Generation with Base64 output
  let pdfBase64: string;
  try {
    const printResult = await Print.printToFileAsync({
      html,
      base64: true,
    });

    if (!printResult.base64 || printResult.base64.trim().length === 0) {
      throw new Error('Print service completed but returned an empty Base64 string.');
    }
    pdfBase64 = printResult.base64;
  } catch (genErr: any) {
    console.error('Passbook PDF generation failed:', genErr);
    return {
      success: false,
      error: 'PDF_GENERATION_FAILED',
      message: genErr?.message || 'Failed to generate PDF document.',
    };
  }

  // Step 6: Write PDF Base64 directly into app's own cacheDirectory (no cross-directory copy)
  const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!baseDir) {
    console.error('No usable cache or document directory found on device.');
    return {
      success: false,
      error: 'STORAGE_UNAVAILABLE',
      message: 'Application storage directory is not available on this device.',
    };
  }

  const destinationUri = `${baseDir}${targetFileName}`;

  try {
    await FileSystem.writeAsStringAsync(destinationUri, pdfBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Step 7: Verify written file exists with non-zero size
    const fileInfo = await FileSystem.getInfoAsync(destinationUri);
    if (!fileInfo.exists) {
      throw new Error(`Written PDF file not found at destination: ${destinationUri}`);
    }
    if ('size' in fileInfo && typeof fileInfo.size === 'number' && fileInfo.size <= 0) {
      throw new Error(`Written PDF file is empty (0 bytes) at destination: ${destinationUri}`);
    }
  } catch (writeErr: any) {
    console.error('Passbook PDF file write failed:', {
      destinationUri,
      error: writeErr?.message || writeErr,
    });
    return {
      success: false,
      error: 'PDF_WRITE_FAILED',
      message: `Failed to save passbook PDF to cache: ${writeErr?.message || 'File write error'}`,
    };
  }

  // Step 8: Trigger Native Share/Save sheet using the verified destination URI
  try {
    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (!isSharingAvailable) {
      console.warn('Native sharing is not available on this device.');
      return {
        success: false,
        error: 'SHARING_UNAVAILABLE',
        message: 'Sharing is not supported or unavailable on this device.',
        uri: destinationUri,
      };
    }

    await Sharing.shareAsync(destinationUri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: targetFileName,
    });

    return {
      success: true,
      uri: destinationUri,
      paidInstallments: 12,
      totalInstallments: 12,
    };
  } catch (shareErr: any) {
    console.error('Passbook PDF sharing failed:', {
      destinationUri,
      error: shareErr?.message || shareErr,
    });
    return {
      success: false,
      error: 'PDF_SHARE_FAILED',
      message: shareErr?.message || 'Failed to open device share dialog.',
      uri: destinationUri,
    };
  }
}
