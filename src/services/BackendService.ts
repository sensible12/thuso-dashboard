import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, updateDoc, deleteDoc, Firestore } from 'firebase/firestore';

export interface CaseReport {
  id: string;
  name: string;
  age: number;
  sex: string;
  country: string;
  location: string;
  details: string;
  contact_name: string;
  contact_phone: string;
  created_at: string;
  submitted: boolean;
  status: 'missing' | 'found' | 'closed';
  verification_status: 'Pending verification' | 'Verified' | 'Rejected';
  photo_url: string | null;
  photo_original_url: string | null;
  photo_file_id: string | null;
  storage_provider: string | null;
  case_id?: string;
  province?: string;
}

export interface AnnouncementPayload {
  title: string;
  message: string;
  category: 'safety_alert' | 'community_update' | 'person_found' | 'general';
  targetTopic?: string;
  reportId?: string;
  photoUrl?: string;
  senderName?: string;
}

export interface AnnouncementHistoryItem {
  id: string;
  title: string;
  message: string;
  category: string;
  targetTopic: string;
  sentAt: string;
  senderName: string;
  status: 'sent' | 'failed' | 'simulated';
}

export function getCaseId(report: { id: string; country: string; province?: string; location?: string; case_id?: string }): string {
  if (report.case_id) return report.case_id;

  const countryCodes: Record<string, string> = {
    'Lesotho': 'LS',
    'Botswana': 'BW',
    'Namibia': 'NA',
    'Eswatini': 'SZ',
    'South Africa': 'ZA',
  };
  const cCode = countryCodes[report.country] || (report.country ? report.country.substring(0, 2).toUpperCase() : 'UN');
  
  const provinces: Record<string, Record<string, string>> = {
    'Lesotho': {
      'Maseru': 'MSR', 'Berea': 'BR', 'Leribe': 'LR', 'Mafeteng': 'MF',
      'Mohale\'s Hoek': 'MH', 'Mokhotlong': 'MK', 'Qacha\'s Nek': 'QN',
      'Quthing': 'QT', 'Butha-Buthe': 'BB', 'Thaba-Tseka': 'TT'
    },
    'South Africa': {
      'Gauteng': 'GP', 'Western Cape': 'CPT', 'KwaZulu-Natal': 'KZN',
      'Eastern Cape': 'EC', 'Free State': 'FS', 'Limpopo': 'LP',
      'Mpumalanga': 'MP', 'North West': 'NW', 'Northern Cape': 'NC'
    },
    'Botswana': {
      'Gaborone': 'GBE', 'Francistown': 'FRW', 'Kweneng': 'KW', 'Ngamiland': 'NG',
      'Central': 'CE', 'Southern': 'SO', 'Kgatleng': 'KG', 'North-East': 'NE',
      'South-East': 'SE', 'Kgalagadi': 'KGD', 'Ghanzi': 'GH', 'Chobe': 'CH'
    },
    'Namibia': {
      'Khomas (Windhoek)': 'WHK', 'Windhoek': 'WHK', 'Khomas': 'WHK', 'Erongo': 'ERN', 'Otjozondjupa': 'OTJ',
      'Oshana': 'OSH', 'Oshikoto': 'OSI', 'Omusati': 'OMU', 'Ohangwena': 'OHA',
      'Kunene': 'KUN', 'Hardap': 'HAR', 'Karas': 'KAR', 'Kavango East': 'KAE',
      'Kavango West': 'KAW', 'Zambezi': 'ZAM', 'Omaheke': 'OMA'
    },
    'Eswatini': {
      'Manzini': 'MZN', 'Hhohho': 'HH', 'Lubombo': 'LUB', 'Shiselweni': 'SHI'
    }
  };

  let pCode = 'GEN';
  const provName = report.province || '';
  if (provName && provinces[report.country]?.[provName]) {
    pCode = provinces[report.country][provName];
  } else {
    const loc = (report.location || '').toLowerCase();
    const countryProvs = provinces[report.country] || {};
    for (const [name, code] of Object.entries(countryProvs)) {
      if (loc.includes(name.toLowerCase())) {
        pCode = code;
        break;
      }
    }
  }
  
  const suffix = report.id.length >= 4 ? report.id.substring(report.id.length - 4) : report.id;
  return `${cCode}-${pCode}-${suffix}`;
}

export interface ConnectionConfig {
  mode: 'mock' | 'live';
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    collectionName: string;
  };
  supabase: {
    url: string;
    anonKey: string;
    tableName: string;
  };
  appwrite: {
    endpoint: string;
    projectId: string;
    databaseId: string;
    collectionId: string;
  };
}

const DEFAULT_CONFIG: ConnectionConfig = {
  mode: 'live',
  firebase: {
    apiKey: 'AIzaSyDtcsdOZzuK3fYTtA1wtRQRj_R4d7xaMGw',
    authDomain: 'thuso-organization.firebaseapp.com',
    projectId: 'thuso-organization',
    storageBucket: 'thuso-organization.firebasestorage.app',
    messagingSenderId: '980628205092',
    appId: '1:980628205092:web:23e358d34baca5304ff2b1',
    collectionName: 'missing_reports'
  },
  supabase: {
    url: 'https://gfblezjsmpbyucjwxmju.supabase.co',
    anonKey: 'sb_publishable_lNWUFJ2y25Qva4hpOHQsAg_0ZsWN3x9',
    tableName: 'missing_reports'
  },
  appwrite: {
    endpoint: 'https://syd.cloud.appwrite.io/v1',
    projectId: '6a44fd1100236aa6e14a',
    databaseId: '6a4ba8910003f31c09e9',
    collectionId: 'missing_reports'
  }
};

const CONFIG_STORAGE_KEY = 'thuso_config';
const MOCK_CASES_KEY = 'thuso_mock_cases';

class BackendService {
  private config: ConnectionConfig;
  private firebaseApp: FirebaseApp | null = null;
  private firestore: Firestore | null = null;
  private supabase: SupabaseClient | null = null;
  public lastFetchErrors: string[] = [];

  constructor() {
    this.config = this.loadConfig();
    this.initClients();
  }

  private loadConfig(): ConnectionConfig {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse connection config, using defaults', e);
      }
    }
    return DEFAULT_CONFIG;
  }

  public getConfig(): ConnectionConfig {
    return this.config;
  }

  public saveConfig(newConfig: ConnectionConfig) {
    this.config = newConfig;
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    this.initClients();
  }

  private initClients() {
    if (this.config.mode === 'mock') {
      this.firebaseApp = null;
      this.firestore = null;
      this.supabase = null;
      return;
    }

    try {
      this.firebaseApp = initializeApp(this.config.firebase);
      this.firestore = getFirestore(this.firebaseApp);
    } catch (e) {
      console.error('Failed to initialize Firebase SDK:', e);
      this.firebaseApp = null;
      this.firestore = null;
    }

    try {
      this.supabase = createClient(this.config.supabase.url, this.config.supabase.anonKey);
    } catch (e) {
      console.error('Failed to initialize Supabase SDK:', e);
      this.supabase = null;
    }
  }

  private getMockCases(): CaseReport[] {
    localStorage.removeItem(MOCK_CASES_KEY);
    return [];
  }

  private saveMockCases(cases: CaseReport[]) {
    localStorage.setItem(MOCK_CASES_KEY, JSON.stringify(cases));
  }

  // --- Main API Methods ---

  public async fetchCases(): Promise<CaseReport[]> {
    this.lastFetchErrors = [];
    if (this.config.mode === 'mock') {
      return this.getMockCases();
    }

    const allCases: CaseReport[] = [];

    // 1. Fetch from Firestore (South Africa)
    if (!this.firestore) {
      this.lastFetchErrors.push('Firestore: client is not available; check Firebase settings.');
    } else {
      try {
        const querySnapshot = await getDocs(collection(this.firestore, this.config.firebase.collectionName));
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          allCases.push(this.mapRawCase(docSnap.id, data));
        });
      } catch (e) {
        console.error('Error fetching Firestore cases:', e);
        this.lastFetchErrors.push(`Firestore: ${this.describeError(e)}`);
      }
    }

    // 2. Fetch from Supabase (Botswana & Namibia)
    if (!this.supabase) {
      this.lastFetchErrors.push('Supabase: client is not available; check connection settings.');
    } else {
      try {
        const pageSize = 1000;
        for (let offset = 0; ; offset += pageSize) {
          const { data, error } = await this.supabase
            .from(this.config.supabase.tableName)
            .select('*')
            .range(offset, offset + pageSize - 1);
          if (error) throw error;
          if (data) {
            data.forEach((row) => {
              allCases.push(this.mapRawCase(row.id, row));
            });
          }
          if (!data || data.length < pageSize) break;
        }
      } catch (e) {
        console.error('Error fetching Supabase cases:', e);
        this.lastFetchErrors.push(`Supabase: ${this.describeError(e)}`);
      }
    }

    // 3. Fetch from Appwrite (Lesotho & Eswatini)
    try {
      const appwriteCases = await this.fetchAppwriteCases();
      allCases.push(...appwriteCases);
    } catch (e) {
      console.error('Error fetching Appwrite cases:', e);
      const originHelp = this.isAppwriteOriginBlocked
        ? ` Add ${window.location.origin} as a Web platform in the Appwrite project settings.`
        : '';
      this.lastFetchErrors.push(`Appwrite: ${this.describeError(e)}.${originHelp}`);
    }

    // Sort cases by creation date descending
    return allCases.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public static resolvePhotoUrl(data: any): string | null {
    if (!data) return null;

    // 1. Check direct original URL first (/view endpoint works without image transformation block)
    const directOriginal = data.photo_original_url || data.photoOriginalUrl;
    if (directOriginal && typeof directOriginal === 'string' && directOriginal.trim().startsWith('http')) {
      return directOriginal.trim();
    }

    // 2. Check photo_url / photoUrl
    const rawPhoto = data.photo_url || data.photoUrl || data.image_url || data.imageUrl;
    if (rawPhoto && typeof rawPhoto === 'string' && rawPhoto.trim().startsWith('http')) {
      const trimmed = rawPhoto.trim();
      // If it is an Appwrite /preview URL that fails with 403 due to cloud plan image transformation limits,
      // rewrite it to the direct /view endpoint
      if (trimmed.includes('/storage/buckets/') && trimmed.includes('/preview')) {
        const viewBase = trimmed.split('/preview')[0] + '/view';
        return `${viewBase}?project=6a44fd1100236aa6e14a`;
      }
      return trimmed;
    }

    // 3. Construct direct view URL from photo_file_id
    const fileId = data.photo_file_id || data.photoFileId || data.fileId || data.file_id;
    if (fileId && typeof fileId === 'string' && fileId.trim().length > 0) {
      return `https://syd.cloud.appwrite.io/v1/storage/buckets/6a4cc11b00140e0bddad/files/${fileId.trim()}/view?project=6a44fd1100236aa6e14a`;
    }

    return null;
  }

  private mapRawCase(id: string, data: any): CaseReport {
    const resolvedPhoto = BackendService.resolvePhotoUrl(data);

    return {
      id: id,
      name: data.name || 'Unknown',
      age: data.age || 0,
      sex: data.sex || data.gender || 'Unknown',
      country: data.country || 'Unknown',
      location: data.location || 'Unknown',
      details: data.details || '',
      contact_name: data.contact_name || '',
      contact_phone: data.contact_phone || '',
      created_at: data.created_at || new Date().toISOString(),
      submitted: data.submitted !== false,
      status: data.status || 'missing',
      verification_status: data.verification_status || 'Pending verification',
      photo_url: resolvedPhoto,
      photo_original_url: data.photo_original_url || resolvedPhoto,
      photo_file_id: data.photo_file_id || null,
      storage_provider: data.storage_provider || null,
      case_id: data.case_id || data.caseId || undefined,
      province: data.province || undefined
    };
  }

  public isAppwriteOriginBlocked = false;

  private async fetchAppwriteCases(): Promise<CaseReport[]> {
    const pageSize = 100;
    const cases: CaseReport[] = [];
    for (let offset = 0; ; offset += pageSize) {
      const url = new URL(
        `${this.config.appwrite.endpoint}/databases/${this.config.appwrite.databaseId}/collections/${this.config.appwrite.collectionId}/documents`
      );
      url.searchParams.set('limit', String(pageSize));
      url.searchParams.set('offset', String(offset));
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Appwrite-Project': this.config.appwrite.projectId,
        }
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        if (
          errJson?.type === 'general_unknown_origin' ||
          (typeof errJson?.message === 'string' && /origin/i.test(errJson.message))
        ) {
          this.isAppwriteOriginBlocked = true;
          console.warn(`[Appwrite] Origin "${window.location.hostname}" is not registered in Appwrite Console.`);
        }
        throw new Error(`Appwrite request failed: ${response.statusText} (${errJson?.message || response.status})`);
      }

      this.isAppwriteOriginBlocked = false;
      const result = await response.json();
      const documents = result.documents || [];
      cases.push(...documents.map((doc: any) => this.mapRawCase(doc.$id, doc)));
      if (documents.length < pageSize) break;
    }
    return cases;
  }

  private describeError(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      return error.message;
    }
    return String(error);
  }

  public async updateCaseVerification(
    caseId: string, 
    country: string, 
    status: 'Pending verification' | 'Verified' | 'Rejected'
  ): Promise<boolean> {
    if (this.config.mode === 'mock') {
      const cases = this.getMockCases();
      const index = cases.findIndex(c => c.id === caseId);
      if (index !== -1) {
        cases[index].verification_status = status;
        this.saveMockCases(cases);
        return true;
      }
      return false;
    }

    // Handle live modes
    switch (country) {
      case 'South Africa':
        return this.updateFirestoreCase(caseId, { verification_status: status });
      case 'Botswana':
      case 'Namibia':
        return this.updateSupabaseCase(caseId, { verification_status: status });
      case 'Lesotho':
      case 'Eswatini':
        return this.updateAppwriteCase(caseId, { verification_status: status });
      default:
        console.error('Unsupported country for live updates:', country);
        return false;
    }
  }

  public async updateCaseStatus(
    caseId: string, 
    country: string, 
    status: 'missing' | 'found' | 'closed'
  ): Promise<boolean> {
    if (this.config.mode === 'mock') {
      const cases = this.getMockCases();
      const index = cases.findIndex(c => c.id === caseId);
      if (index !== -1) {
        cases[index].status = status;
        this.saveMockCases(cases);
        return true;
      }
      return false;
    }

    // Handle live modes
    switch (country) {
      case 'South Africa':
        return this.updateFirestoreCase(caseId, { status: status });
      case 'Botswana':
      case 'Namibia':
        return this.updateSupabaseCase(caseId, { status: status });
      case 'Lesotho':
      case 'Eswatini':
        return this.updateAppwriteCase(caseId, { status: status });
      default:
        console.error('Unsupported country for live updates:', country);
        return false;
    }
  }

  public async reportPersonFound(
    caseId: string,
    country: string,
    currentDetails: string,
    reporterName: string,
    reporterContact: string,
    foundDetails: string
  ): Promise<boolean> {
    const logDate = new Date().toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
    const systemLog = `\n\n[System Log: Reported found by ${reporterName} (${reporterContact}) on ${logDate}. Notes: ${foundDetails}]`;
    const updatedDetails = currentDetails + systemLog;

    if (this.config.mode === 'mock') {
      const cases = this.getMockCases();
      const index = cases.findIndex(c => c.id === caseId);
      if (index !== -1) {
        cases[index].status = 'found';
        cases[index].details = updatedDetails;
        this.saveMockCases(cases);
        return true;
      }
      return false;
    }

    // Live Modes
    const updates = { status: 'found' as const, details: updatedDetails };
    switch (country) {
      case 'South Africa':
        return this.updateFirestoreCase(caseId, updates);
      case 'Botswana':
      case 'Namibia':
        return this.updateSupabaseCase(caseId, updates);
      case 'Lesotho':
      case 'Eswatini':
        return this.updateAppwriteCase(caseId, updates);
      default:
        console.error('Unsupported country for live found reports:', country);
        return false;
    }
  }

  private async updateFirestoreCase(caseId: string, data: Partial<CaseReport>): Promise<boolean> {
    if (!this.firestore) return false;
    try {
      const docRef = doc(this.firestore, this.config.firebase.collectionName, caseId);
      await updateDoc(docRef, data);
      return true;
    } catch (e) {
      console.error('Error updating Firestore document:', e);
      return false;
    }
  }

  private async updateSupabaseCase(caseId: string, data: Partial<CaseReport>): Promise<boolean> {
    if (!this.supabase) return false;
    try {
      const { error } = await this.supabase
        .from(this.config.supabase.tableName)
        .update(data)
        .eq('id', caseId);
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Error updating Supabase row:', e);
      return false;
    }
  }

  private async updateAppwriteCase(caseId: string, data: Partial<CaseReport>): Promise<boolean> {
    const url = `${this.config.appwrite.endpoint}/databases/${this.config.appwrite.databaseId}/collections/${this.config.appwrite.collectionId}/documents/${caseId}`;
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'X-Appwrite-Project': this.config.appwrite.projectId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data })
      });

      if (!response.ok) {
        throw new Error(`Appwrite patch failed: ${response.statusText}`);
      }
      return true;
    } catch (e) {
      console.error('Error updating Appwrite document:', e);
      return false;
    }
  }

  public async deleteCase(caseId: string, country: string): Promise<boolean> {
    if (this.config.mode === 'mock') {
      const cases = this.getMockCases();
      const updated = cases.filter(c => c.id !== caseId);
      if (updated.length !== cases.length) {
        this.saveMockCases(updated);
        return true;
      }
      return false;
    }

    switch (country) {
      case 'South Africa':
        return this.deleteFirestoreCase(caseId);
      case 'Botswana':
      case 'Namibia':
        return this.deleteSupabaseCase(caseId);
      case 'Lesotho':
      case 'Eswatini':
        return this.deleteAppwriteCase(caseId);
      default: {
        const fsSuccess = await this.deleteFirestoreCase(caseId);
        if (fsSuccess) return true;
        const sbSuccess = await this.deleteSupabaseCase(caseId);
        if (sbSuccess) return true;
        return this.deleteAppwriteCase(caseId);
      }
    }
  }

  public async deleteCases(casesToDelete: { id: string; country: string }[]): Promise<{ succeeded: number; failed: number }> {
    let succeeded = 0;
    let failed = 0;
    for (const item of casesToDelete) {
      const ok = await this.deleteCase(item.id, item.country);
      if (ok) {
        succeeded++;
      } else {
        failed++;
      }
    }
    return { succeeded, failed };
  }

  private async deleteFirestoreCase(caseId: string): Promise<boolean> {
    if (!this.firestore) return false;
    try {
      const docRef = doc(this.firestore, this.config.firebase.collectionName, caseId);
      await deleteDoc(docRef);
      return true;
    } catch (e) {
      console.error('Error deleting Firestore document:', e);
      return false;
    }
  }

  private async deleteSupabaseCase(caseId: string): Promise<boolean> {
    if (!this.supabase) return false;
    try {
      const { error } = await this.supabase
        .from(this.config.supabase.tableName)
        .delete()
        .eq('id', caseId);
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Error deleting Supabase row:', e);
      return false;
    }
  }

  private async deleteAppwriteCase(caseId: string): Promise<boolean> {
    const url = `${this.config.appwrite.endpoint}/databases/${this.config.appwrite.databaseId}/collections/${this.config.appwrite.collectionId}/documents/${caseId}`;
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'X-Appwrite-Project': this.config.appwrite.projectId,
        }
      });

      if (!response.ok && response.status !== 204) {
        throw new Error(`Appwrite delete failed: ${response.statusText}`);
      }
      return true;
    } catch (e) {
      console.error('Error deleting Appwrite document:', e);
      return false;
    }
  }

  // --- Push Announcement Broadcasting ---

  public async sendAnnouncement(payload: AnnouncementPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const topic = payload.targetTopic || 'global-missing-person-alerts';

    if (this.config.mode === 'mock') {
      const historyItem: AnnouncementHistoryItem = {
        id: 'ann_' + Date.now(),
        title: payload.title,
        message: payload.message,
        category: payload.category,
        targetTopic: topic,
        sentAt: new Date().toISOString(),
        senderName: payload.senderName || 'Command Center Moderator',
        status: 'simulated'
      };
      this.saveAnnouncementHistory(historyItem);
      return { success: true, messageId: historyItem.id };
    }

    try {
      if (!this.supabase) {
        throw new Error('Supabase live client is not available. Please check connection settings.');
      }

      const response = await this.supabase.functions.invoke('send-global-missing-person-alert', {
        body: {
          topic: topic,
          reportId: payload.reportId || undefined,
          photoUrl: payload.photoUrl || undefined,
          notification: {
            title: payload.title,
            body: payload.message
          },
          data: {
            type: 'announcement',
            category: payload.category,
            title: payload.title,
            body: payload.message,
            message: payload.message,
            reportId: payload.reportId || '',
            photoUrl: payload.photoUrl || '',
            sent_at: new Date().toISOString(),
            sender_name: payload.senderName || 'Command Center Moderator'
          }
        }
      });

      if (response.error) {
        throw response.error;
      }

      const resData = response.data;
      const historyItem: AnnouncementHistoryItem = {
        id: 'ann_' + Date.now(),
        title: payload.title,
        message: payload.message,
        category: payload.category,
        targetTopic: topic,
        sentAt: new Date().toISOString(),
        senderName: payload.senderName || 'Command Center Moderator',
        status: 'sent'
      };
      this.saveAnnouncementHistory(historyItem);

      return {
        success: true,
        messageId: resData?.result?.name || historyItem.id
      };
    } catch (e: any) {
      console.error('Error broadcasting announcement:', e);
      return {
        success: false,
        error: e.message || 'Failed to dispatch push announcement'
      };
    }
  }

  public getAnnouncementHistory(): AnnouncementHistoryItem[] {
    const raw = localStorage.getItem('thuso_announcements_history');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (_) {}
    }
    return [];
  }

  private saveAnnouncementHistory(item: AnnouncementHistoryItem) {
    const list = this.getAnnouncementHistory();
    list.unshift(item);
    localStorage.setItem('thuso_announcements_history', JSON.stringify(list.slice(0, 50)));
  }
}

export const backendService = new BackendService();
