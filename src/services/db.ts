import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  writeBatch,
  Timestamp,
  serverTimestamp,
  increment,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import {
  Organisation,
  Department,
  Unit,
  Membership,
  Person,
  VotingExercise,
  Criterion,
  Nominee,
  Eligibility,
  Vote,
  VotingResult,
  NomineeResult,
  WinnerRecord,
  LegacyWinnerRecord,
  AuditLog,
  SystemConfig,
  UserProfile,
  UserAccount,
  StatusType,
  ExerciseStatus,
  VotingScopeType,
  VoterSelectionMode,
  NomineeSelectionMode
} from '../types';
import {
  OFFICIAL_USERNAMES,
  SUPER_ADMIN_OFFICIAL_USERNAME,
  OFFICIAL_USERS_LIST
} from '../constants/officialUsers';

// ==========================================
// FIRESTORE ERROR HANDLING (PER FIREBASE SKILL)
// ==========================================
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ==========================================
// AUDIT LOGGING HELPER
// ==========================================
export async function logAuditEvent(
  actor: { id: string; name: string; email?: string; role?: string },
  action: string,
  resourceType: AuditLog['resourceType'],
  resourceId: string,
  details?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const logRef = doc(collection(db, 'auditLogs'));
    const auditLog: AuditLog = {
      id: logRef.id,
      actorId: actor.id || 'system',
      actorName: actor.name || 'System Administrator',
      actorEmail: actor.email || '',
      actorRole: actor.role || 'admin',
      action,
      resourceType,
      resourceId,
      details: details || '',
      metadata: metadata || {},
      createdAt: new Date().toISOString()
    };
    await setDoc(logRef, auditLog);
  } catch (error) {
    console.warn('Could not record audit log:', error);
  }
}

// ==========================================
// FIRESTORE READ QUOTA OPTIMIZATION CACHE
// Multi-Tier Architecture: Memory + LocalStorage + In-Flight Request Deduplication
// Eliminates redundant Firestore reads and reduces quota usage to near-zero.
// ==========================================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // in milliseconds
}

const memoryCache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();
const LOCAL_STORAGE_CACHE_PREFIX = 'trh_db_cache_';

// Safely access localStorage with quota management and automatic cleanup
function saveToPersistentStorage(key: string, entry: CacheEntry<any>): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    try {
      const now = Date.now();
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(LOCAL_STORAGE_CACHE_PREFIX)) {
          const item = localStorage.getItem(k);
          if (item) {
            try {
              const parsed = JSON.parse(item);
              if (parsed && parsed.timestamp && parsed.ttl && now - parsed.timestamp > parsed.ttl) {
                keysToRemove.push(k);
              }
            } catch {
              keysToRemove.push(k);
            }
          }
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(LOCAL_STORAGE_CACHE_PREFIX + key, JSON.stringify(entry));
    } catch {
      // In-memory will continue to work gracefully if disk quota is hard-capped
    }
  }
}

function loadFromPersistentStorage<T>(key: string, allowStale = false): CacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (!entry || !entry.timestamp || !entry.ttl) {
      localStorage.removeItem(LOCAL_STORAGE_CACHE_PREFIX + key);
      return null;
    }
    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired && !allowStale) {
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function removeFromPersistentStorage(keyOrPrefix: string): void {
  try {
    const fullPrefix = LOCAL_STORAGE_CACHE_PREFIX + keyOrPrefix;
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k === fullPrefix || k.startsWith(fullPrefix))) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignore storage errors
  }
}

export const dbCache = {
  get<T>(key: string): T | null {
    // 1. Check in-memory cache for 0ms access
    const memoryEntry = memoryCache.get(key);
    if (memoryEntry) {
      const isExpired = Date.now() - memoryEntry.timestamp > memoryEntry.ttl;
      if (isExpired) {
        return null;
      }
      return memoryEntry.data as T;
    }

    // 2. Check persistent disk cache across reloads & sessions
    const diskEntry = loadFromPersistentStorage<T>(key, false);
    if (diskEntry) {
      // Rehydrate memory cache
      memoryCache.set(key, diskEntry);
      return diskEntry.data;
    }

    return null;
  },

  /**
   * Retrieves data even if expired; used as a resilient fallback during Firestore quota exhaustion.
   */
  getStale<T>(key: string): T | null {
    const memoryEntry = memoryCache.get(key);
    if (memoryEntry && memoryEntry.data !== undefined) {
      return memoryEntry.data as T;
    }
    const diskEntry = loadFromPersistentStorage<T>(key, true);
    if (diskEntry && diskEntry.data !== undefined) {
      memoryCache.set(key, diskEntry);
      return diskEntry.data;
    }
    return null;
  },

  set<T>(key: string, data: T, ttlMs = 86400000): void { // default 24 hours TTL
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    };
    memoryCache.set(key, entry);
    saveToPersistentStorage(key, entry);
  },

  invalidate(keyOrPrefix: string): void {
    if (memoryCache.has(keyOrPrefix)) {
      memoryCache.delete(keyOrPrefix);
    }
    for (const k of Array.from(memoryCache.keys())) {
      if (k.startsWith(keyOrPrefix)) {
        memoryCache.delete(k);
      }
    }
    removeFromPersistentStorage(keyOrPrefix);

    // Broadcast cache invalidation across open tabs and components
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('trh_cache_sync', { detail: { key: keyOrPrefix } }));
        localStorage.setItem('trh_cache_sync_pulse', `${keyOrPrefix}:${Date.now()}`);
      }
    } catch {
      // ignore
    }
  },

  clear(): void {
    memoryCache.clear();
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(LOCAL_STORAGE_CACHE_PREFIX)) {
          toRemove.push(k);
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  },

  /**
   * In-flight Promise deduplication: merges concurrent identical read requests
   * into a single Promise to prevent duplicate network calls to Firestore.
   * Also protects against quota exhaustion by automatically serving cached data if Firestore fails.
   */
  async dedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const existing = inFlightRequests.get(key);
    if (existing) {
      return existing as Promise<T>;
    }
    const promise = (async () => {
      try {
        return await fetcher();
      } catch (err: any) {
        // Quota Limit / Resource Exhaustion Guard:
        // If Firestore read quota is exceeded or network fails, gracefully return stale cached data if available!
        const stale = dbCache.getStale<T>(key);
        if (stale !== null) {
          console.warn(`[Firestore Quota Guard] Handled read exception (${err?.message || err}). Serving cached data for "${key}".`);
          dbCache.set(key, stale, 1800000); // 30 min cool-down buffer
          return stale;
        }
        throw err;
      } finally {
        inFlightRequests.delete(key);
      }
    })();
    inFlightRequests.set(key, promise);
    return promise;
  }
};

// Set up cross-tab synchronization listener for cache invalidation
if (typeof window !== 'undefined') {
  try {
    window.addEventListener('storage', (event) => {
      if (event.key === 'trh_cache_sync_pulse' && event.newValue) {
        const prefix = event.newValue.split(':')[0];
        if (prefix) {
          for (const k of Array.from(memoryCache.keys())) {
            if (k.startsWith(prefix)) {
              memoryCache.delete(k);
            }
          }
        }
      }
    });
    window.addEventListener('trh_cache_sync', (event: any) => {
      const key = event?.detail?.key;
      if (key) {
        for (const k of Array.from(memoryCache.keys())) {
          if (k.startsWith(key)) {
            memoryCache.delete(k);
          }
        }
      }
    });
  } catch {
    // ignore
  }
}

// ==========================================
// SYSTEM CONFIG & BRANDING
// ==========================================
export function cleanFirestoreData<T extends Record<string, any>>(data: T): Partial<T> {
  const cleaned: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        cleaned[key] = cleanFirestoreData(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
}

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  id: 'global',
  churchName: 'TRH Workforce',
  churchTagline: 'Recognition System',
  tagline: 'Recognition System',
  description: 'TRH Ministries Global Recognition and Voting Platform',
  logoUrl: '/logo.png',
  primaryColor: '#251464', // Deep Royal Purple
  secondaryColor: '#FF8A00', // Vibrant Orange
  accentColor: '#E85B00', // Flame Orange
  defaultTimezone: 'UTC',
  voterAccessMode: 'auth_or_code',
  allowOpenVoterRegistration: true,
  contactEmail: 'admin@trhworkforce.org',
  supportEmail: 'admin@trhworkforce.org',
  updatedAt: new Date().toISOString()
};

// Baseline bundled datasets for instantaneous loading with near-zero Firestore reads
export const DEFAULT_ORGANISATIONS: Organisation[] = [
  {
    id: 'org-sanctuary',
    name: 'Sanctuary Organisation',
    slug: 'sanctuary-organisation',
    description: 'Responsible for maintaining church premises, stage order, and reverence in the house of God.',
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdBy: 'system'
  },
  {
    id: 'org-music',
    name: 'Music & Worship Organisation',
    slug: 'music-worship-organisation',
    description: 'Leading the congregation in worship, choir orchestration, and musical excellence.',
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdBy: 'system'
  },
  {
    id: 'org-media',
    name: 'Media & Tech Organisation',
    slug: 'media-tech-organisation',
    description: 'Powering live streams, broadcast graphics, camera switching, acoustics, and cloud operations.',
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdBy: 'system'
  },
  {
    id: 'org-protocol',
    name: 'Protocol & Hospitality Organisation',
    slug: 'protocol-hospitality-organisation',
    description: 'Ensuring orderly seating, VIP welcoming, first-time guest reception, and seamless logistics.',
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdBy: 'system'
  }
];

export const DEFAULT_DEPARTMENTS: Department[] = [
  {
    id: 'dept-sanctuary-1',
    organisationId: 'org-sanctuary',
    organisationName: 'Sanctuary Organisation',
    name: 'Sanctuary Maintenance Team',
    slug: 'sanctuary-maintenance-team',
    description: 'Auditorium preparation, cleanliness, and altar care.',
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdBy: 'system'
  },
  {
    id: 'dept-sanctuary-2',
    organisationId: 'org-sanctuary',
    organisationName: 'Sanctuary Organisation',
    name: 'Ushering & Seat Stewards',
    slug: 'ushering-seat-stewards',
    description: 'Crowd coordination and communion distribution.',
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdBy: 'system'
  },
  {
    id: 'dept-music-1',
    organisationId: 'org-music',
    organisationName: 'Music & Worship Organisation',
    name: 'Choir & Vocalists',
    slug: 'choir-vocalists',
    description: 'Harmonies, praise leads, and choral arrangements.',
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdBy: 'system'
  },
  {
    id: 'dept-media-1',
    organisationId: 'org-media',
    organisationName: 'Media & Tech Organisation',
    name: 'Live Broadcast & Video Streaming',
    slug: 'live-broadcast-video-streaming',
    description: 'Directing multi-camera feeds, online stream feeds, and visual overlays.',
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdBy: 'system'
  },
  {
    id: 'dept-protocol-1',
    organisationId: 'org-protocol',
    organisationName: 'Protocol & Hospitality Organisation',
    name: 'VIP & Pastoral Protocol',
    slug: 'vip-pastoral-protocol',
    description: 'Guest speaker hospitality, pulpit assistance, and executive security escort.',
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdBy: 'system'
  }
];

export const DEFAULT_LEGACY_WINNERS: LegacyWinnerRecord[] = [
  {
    id: 'legacy-sample-1',
    name: 'Sister Blessing Adeleke',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    organisationName: 'Media & Tech Organisation',
    organisationId: 'org-media',
    departmentName: 'Live Broadcast & Video Streaming',
    departmentId: 'dept-media-1',
    month: 'November',
    year: 2024,
    awardCategory: 'departmental',
    awardScope: 'Departmental',
    awardTitle: 'Worker of the Month',
    roleOrTitle: 'Live Stream Sound Engineer',
    citation: 'Faithful and unwavering dedication to sanctuary broadcast operations and Sunday sound reinforcement within Media & Audio.',
    votesCount: 48,
    createdAt: '2024-11-30T00:00:00.000Z',
    updatedAt: '2024-11-30T00:00:00.000Z',
    createdBy: 'system'
  },
  {
    id: 'legacy-sample-2',
    name: 'Brother Samuel Adeyemi',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    organisationName: 'TRH Workforce',
    organisationId: 'org-sanctuary',
    departmentName: 'All Departments / Workforce',
    departmentId: '',
    month: 'December',
    year: 2024,
    awardCategory: 'workforce_wide',
    awardScope: 'All Departments / Entire Workforce',
    awardTitle: 'Worker of the Month (All Departments)',
    roleOrTitle: 'Facilities Operations Director',
    citation: 'Distinguished overall worker recognized across the entire church workforce for remarkable coordination, excellence, and servant leadership.',
    votesCount: 112,
    createdAt: '2024-12-31T00:00:00.000Z',
    updatedAt: '2024-12-31T00:00:00.000Z',
    createdBy: 'system'
  },
  {
    id: 'legacy-sample-3',
    name: 'Deaconess Kemi Balogun',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    organisationName: 'TRH Workforce',
    organisationId: 'org-protocol',
    departmentName: 'Church-wide Innovation Unit',
    departmentId: '',
    month: 'January',
    year: 2025,
    awardCategory: 'innovative',
    awardScope: 'Entire Church (Innovation)',
    awardTitle: 'Innovative Worker of the Month',
    roleOrTitle: 'Digital Systems & Visitor Automation Lead',
    citation: 'Pioneered digital QR-checkin kiosks and seamless first-timer automated discipleship follow-up, transforming church guest retention.',
    votesCount: 89,
    createdAt: '2025-01-31T00:00:00.000Z',
    updatedAt: '2025-01-31T00:00:00.000Z',
    createdBy: 'system'
  }
];

export async function getSystemConfig(forceRefresh = false): Promise<SystemConfig> {
  const cacheKey = 'systemConfig';
  if (!forceRefresh) {
    const cached = dbCache.get<SystemConfig>(cacheKey);
    if (cached) return cached;
  }

  return dbCache.dedupe(cacheKey, async () => {
    try {
      const docRef = doc(db, 'systemConfig', 'global');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const cfg = { ...DEFAULT_SYSTEM_CONFIG, ...snap.data() } as SystemConfig;
        dbCache.set(cacheKey, cfg, 604800000); // 7 days cache in persistent storage
        return cfg;
      }
      dbCache.set(cacheKey, DEFAULT_SYSTEM_CONFIG, 604800000);
      return DEFAULT_SYSTEM_CONFIG;
    } catch (error) {
      console.warn('System config load note (using defaults):', error);
      const stale = dbCache.getStale<SystemConfig>(cacheKey);
      if (stale) return stale;
      return DEFAULT_SYSTEM_CONFIG;
    }
  });
}

export async function updateSystemConfig(
  config: Partial<SystemConfig>,
  actor: { id: string; name: string; email?: string }
): Promise<SystemConfig> {
  const docRef = doc(db, 'systemConfig', 'global');
  const rawData: Record<string, any> = {
    ...config,
    updatedAt: new Date().toISOString()
  };

  // Ensure undefined fields are eliminated to satisfy Firestore setDoc constraints
  const updatedData = cleanFirestoreData(rawData);

  await setDoc(docRef, updatedData, { merge: true });
  dbCache.invalidate('systemConfig');
  await logAuditEvent(actor, 'Updated Church Branding & System Configuration', 'systemConfig', 'global', 'Updated system config settings', updatedData);
  return getSystemConfig(true);
}

// ==========================================
// ORGANISATIONS CMS
// ==========================================
export async function getOrganisations(includeArchived = false, forceRefresh = false): Promise<Organisation[]> {
  const masterKey = 'orgs_master';
  if (!forceRefresh) {
    const cachedMaster = dbCache.get<Organisation[]>(masterKey);
    if (cachedMaster && cachedMaster.length > 0) {
      return includeArchived ? cachedMaster : cachedMaster.filter(o => o.status !== 'archived');
    }
  }

  return dbCache.dedupe(masterKey, async () => {
    try {
      const orgsRef = collection(db, 'organisations');
      const snap = await getDocs(orgsRef);
      let orgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Organisation));
      
      if (orgs.length === 0) {
        orgs = DEFAULT_ORGANISATIONS;
      }

      // Sort by name
      orgs.sort((a, b) => a.name.localeCompare(b.name));
      dbCache.set(masterKey, orgs, 604800000); // 7 days TTL

      return includeArchived ? orgs : orgs.filter(o => o.status !== 'archived');
    } catch (error) {
      console.warn('Error getting organisations (serving cached/defaults):', error);
      const stale = dbCache.getStale<Organisation[]>(masterKey);
      if (stale && stale.length > 0) {
        return includeArchived ? stale : stale.filter(o => o.status !== 'archived');
      }
      return includeArchived ? DEFAULT_ORGANISATIONS : DEFAULT_ORGANISATIONS.filter(o => o.status !== 'archived');
    }
  });
}

export async function getOrganisationById(id: string, forceRefresh = false): Promise<Organisation | null> {
  // Check master cache first to avoid Firestore read
  if (!forceRefresh) {
    const master = dbCache.get<Organisation[]>('orgs_master');
    if (master) {
      const found = master.find(o => o.id === id);
      if (found) return found;
    }
    const cached = dbCache.get<Organisation>(`org_doc_${id}`);
    if (cached) return cached;
  }

  return dbCache.dedupe(`org_doc_${id}`, async () => {
    try {
      const docRef = doc(db, 'organisations', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const org = { id: snap.id, ...snap.data() } as Organisation;
        dbCache.set(`org_doc_${id}`, org, 86400000); // 24 hours TTL
        return org;
      }
      return null;
    } catch (error) {
      console.error(`Error getting organisation ${id}:`, error);
      return null;
    }
  });
}

export async function createOrganisation(
  data: Omit<Organisation, 'id' | 'createdAt' | 'updatedAt' | 'departmentCount' | 'votingExerciseCount'>,
  actor: { id: string; name: string; email?: string }
): Promise<Organisation> {
  const docRef = doc(collection(db, 'organisations'));
  const now = new Date().toISOString();
  const org: Organisation = {
    ...data,
    id: docRef.id,
    slug: data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    status: data.status || 'active',
    departmentCount: 0,
    votingExerciseCount: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: actor.id
  };
  await setDoc(docRef, org);
  dbCache.invalidate('orgs');
  await logAuditEvent(actor, 'Created Organisation', 'organisation', org.id, `Created ${org.name}`, org);
  return org;
}

export async function updateOrganisation(
  id: string,
  data: Partial<Organisation>,
  actor: { id: string; name: string; email?: string }
): Promise<void> {
  const docRef = doc(db, 'organisations', id);
  const now = new Date().toISOString();
  await updateDoc(docRef, {
    ...data,
    updatedAt: now
  });
  dbCache.invalidate('orgs');
  dbCache.invalidate(`org_doc_${id}`);
  await logAuditEvent(actor, 'Updated Organisation', 'organisation', id, `Updated organisation ${data.name || id}`, data);
}

export async function archiveOrganisation(
  id: string,
  actor: { id: string; name: string; email?: string }
): Promise<void> {
  const docRef = doc(db, 'organisations', id);
  const now = new Date().toISOString();
  await updateDoc(docRef, {
    status: 'archived',
    updatedAt: now
  });
  dbCache.invalidate('orgs');
  dbCache.invalidate(`org_doc_${id}`);
  await logAuditEvent(actor, 'Archived Organisation', 'organisation', id, `Archived organisation ${id}`);
}

export function assertSuperAdmin(
  actor?: { id?: string; name?: string; email?: string; role?: string },
  actionDescription = 'this item'
): void {
  const isSuper =
    actor?.role === 'super_admin' ||
    actor?.email === 'yinkopet@gmail.com' ||
    actor?.name === 'Executive Director, Information, Communication & Technology';
  if (!isSuper) {
    throw new Error(`Permission Denied: Only the Super Administrator has authority to delete ${actionDescription}.`);
  }
}

export async function deleteOrganisation(
  id: string,
  actor: { id: string; name: string; email?: string; role?: string }
): Promise<void> {
  assertSuperAdmin(actor, 'organisations');
  const docRef = doc(db, 'organisations', id);
  await deleteDoc(docRef);
  dbCache.invalidate('orgs');
  dbCache.invalidate(`org_doc_${id}`);
  await logAuditEvent(actor, 'Deleted Organisation', 'organisation', id, `Super Admin permanently deleted organisation ${id}`);
}

// ==========================================
// DEPARTMENTS CMS
// ==========================================
export async function getDepartments(organisationId?: string, includeArchived = false, forceRefresh = false): Promise<Department[]> {
  const masterKey = 'depts_master';
  if (!forceRefresh) {
    const cachedMaster = dbCache.get<Department[]>(masterKey);
    if (cachedMaster && cachedMaster.length > 0) {
      let filtered = cachedMaster;
      if (organisationId && organisationId !== 'all') {
        filtered = filtered.filter(d => d.organisationId === organisationId);
      }
      if (!includeArchived) {
        filtered = filtered.filter(d => d.status !== 'archived');
      }
      return filtered;
    }
  }

  return dbCache.dedupe(masterKey, async () => {
    try {
      const deptsRef = collection(db, 'departments');
      const snap = await getDocs(deptsRef);
      let depts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Department));
      
      if (depts.length === 0) {
        depts = DEFAULT_DEPARTMENTS;
      }

      depts.sort((a, b) => a.name.localeCompare(b.name));
      dbCache.set(masterKey, depts, 604800000); // 7 days TTL

      let filtered = depts;
      if (organisationId && organisationId !== 'all') {
        filtered = filtered.filter(d => d.organisationId === organisationId);
      }
      if (!includeArchived) {
        filtered = filtered.filter(d => d.status !== 'archived');
      }
      return filtered;
    } catch (error) {
      console.warn('Error getting departments (serving cached/defaults):', error);
      const stale = dbCache.getStale<Department[]>(masterKey);
      let baseList = (stale && stale.length > 0) ? stale : DEFAULT_DEPARTMENTS;
      if (organisationId && organisationId !== 'all') {
        baseList = baseList.filter(d => d.organisationId === organisationId);
      }
      if (!includeArchived) {
        baseList = baseList.filter(d => d.status !== 'archived');
      }
      return baseList;
    }
  });
}

export async function createDepartment(
  data: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>,
  actor: { id: string; name: string; email?: string }
): Promise<Department> {
  if (!data.name || !data.name.trim()) {
    throw new Error('Department name is required.');
  }
  if (!data.organisationId) {
    throw new Error('Organisation ID is required for a department.');
  }

  // Validate parent organisation exists
  const orgRef = doc(db, 'organisations', data.organisationId);
  const orgSnap = await getDoc(orgRef);
  if (!orgSnap.exists()) {
    throw new Error('Validation failed: The selected parent organisation does not exist.');
  }
  const orgData = orgSnap.data() as Organisation;

  const docRef = doc(collection(db, 'departments'));
  const now = new Date().toISOString();
  const dept: Department = {
    ...data,
    organisationName: data.organisationName || orgData.name,
    id: docRef.id,
    slug: data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    status: data.status || 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: actor.id
  };
  await setDoc(docRef, dept);

  // Update department count on organisation
  try {
    await updateDoc(orgRef, {
      departmentCount: increment(1),
      updatedAt: now
    });
  } catch (e) {
    console.warn('Could not increment org dept count', e);
  }

  dbCache.invalidate('depts');
  dbCache.invalidate('orgs');
  await logAuditEvent(actor, 'Created Department', 'department', dept.id, `Created ${dept.name}`, dept);
  return dept;
}

export async function updateDepartment(
  id: string,
  data: Partial<Department>,
  actor: { id: string; name: string; email?: string }
): Promise<void> {
  const docRef = doc(db, 'departments', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error('Department not found');
  }
  const existing = snap.data() as Department;

  let resolvedOrgName = data.organisationName || existing.organisationName;
  if (data.organisationId && data.organisationId !== existing.organisationId) {
    const orgRef = doc(db, 'organisations', data.organisationId);
    const orgSnap = await getDoc(orgRef);
    if (!orgSnap.exists()) {
      throw new Error('Validation failed: The specified parent organisation does not exist.');
    }
    resolvedOrgName = (orgSnap.data() as Organisation).name;
  }

  const now = new Date().toISOString();
  await updateDoc(docRef, {
    ...data,
    organisationName: resolvedOrgName,
    updatedAt: now
  });
  dbCache.invalidate('depts');
  await logAuditEvent(actor, 'Updated Department', 'department', id, `Updated department ${data.name || existing.name}`, data);
}

export async function archiveDepartment(
  id: string,
  actor: { id: string; name: string; email?: string }
): Promise<void> {
  const docRef = doc(db, 'departments', id);
  const snap = await getDoc(docRef);
  const dept = snap.data() as Department | undefined;
  const now = new Date().toISOString();

  await updateDoc(docRef, {
    status: 'archived',
    updatedAt: now
  });

  if (dept?.organisationId) {
    try {
      const orgRef = doc(db, 'organisations', dept.organisationId);
      await updateDoc(orgRef, {
        departmentCount: increment(-1),
        updatedAt: now
      });
    } catch (e) {
      // ignore
    }
  }

  dbCache.invalidate('depts');
  dbCache.invalidate('orgs');
  await logAuditEvent(actor, 'Archived Department', 'department', id, `Archived department ${id}`);
}

export async function deleteDepartment(
  id: string,
  actor: { id: string; name: string; email?: string; role?: string }
): Promise<void> {
  assertSuperAdmin(actor, 'departments');
  const docRef = doc(db, 'departments', id);
  const snap = await getDoc(docRef);
  const dept = snap.data() as Department | undefined;
  await deleteDoc(docRef);

  if (dept?.organisationId) {
    try {
      const orgRef = doc(db, 'organisations', dept.organisationId);
      await updateDoc(orgRef, {
        departmentCount: increment(-1),
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      // ignore
    }
  }

  dbCache.invalidate('depts');
  dbCache.invalidate('orgs');
  await logAuditEvent(actor, 'Deleted Department', 'department', id, `Super Admin permanently deleted department ${id}`);
}

// ==========================================
// UNITS CMS (UNITS ARE UNDER DEPARTMENTS)
// ==========================================
export async function getUnits(
  departmentId?: string,
  organisationId?: string,
  includeArchived = false,
  forceRefresh = false
): Promise<Unit[]> {
  const masterKey = 'units_master';
  if (!forceRefresh) {
    const cachedMaster = dbCache.get<Unit[]>(masterKey);
    if (cachedMaster) {
      let filtered = cachedMaster;
      if (organisationId && organisationId !== 'all') {
        filtered = filtered.filter(u => u.organisationId === organisationId);
      }
      if (departmentId && departmentId !== 'all') {
        filtered = filtered.filter(u => u.departmentId === departmentId);
      }
      if (!includeArchived) {
        filtered = filtered.filter(u => u.status !== 'archived');
      }
      return filtered;
    }
  }

  return dbCache.dedupe(masterKey, async () => {
    try {
      const unitsRef = collection(db, 'units');
      const snap = await getDocs(unitsRef);
      let units = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit));
      units.sort((a, b) => a.name.localeCompare(b.name));
      dbCache.set(masterKey, units, 86400000); // 24 hours TTL

      let filtered = units;
      if (organisationId && organisationId !== 'all') {
        filtered = filtered.filter(u => u.organisationId === organisationId);
      }
      if (departmentId && departmentId !== 'all') {
        filtered = filtered.filter(u => u.departmentId === departmentId);
      }
      if (!includeArchived) {
        filtered = filtered.filter(u => u.status !== 'archived');
      }
      return filtered;
    } catch (error) {
      console.error('Error getting units:', error);
      return [];
    }
  });
}

export async function getUnitById(id: string, forceRefresh = false): Promise<Unit | null> {
  if (!forceRefresh) {
    const master = dbCache.get<Unit[]>('units_master');
    if (master) {
      const found = master.find(u => u.id === id);
      if (found) return found;
    }
    const cached = dbCache.get<Unit>(`unit_doc_${id}`);
    if (cached) return cached;
  }

  return dbCache.dedupe(`unit_doc_${id}`, async () => {
    try {
      const docRef = doc(db, 'units', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const u = { id: snap.id, ...snap.data() } as Unit;
        dbCache.set(`unit_doc_${id}`, u, 86400000); // 24 hours TTL
        return u;
      }
      return null;
    } catch (error) {
      console.error(`Error getting unit ${id}:`, error);
      return null;
    }
  });
}

export async function createUnit(
  data: Omit<Unit, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> & { createdBy?: string },
  actor: { id: string; name: string; email?: string }
): Promise<Unit> {
  if (!data.name || !data.name.trim()) {
    throw new Error('Unit name is required.');
  }
  if (!data.organisationId) {
    throw new Error('Organisation ID is required for a unit.');
  }
  if (!data.departmentId) {
    throw new Error('Department ID is required for a unit (Units belong to Departments).');
  }

  // 1. Validate parent Organisation exists
  const orgRef = doc(db, 'organisations', data.organisationId);
  const orgSnap = await getDoc(orgRef);
  if (!orgSnap.exists()) {
    throw new Error('Validation failed: The selected parent organisation does not exist.');
  }
  const orgData = orgSnap.data() as Organisation;

  // 2. Validate parent Department exists AND belongs to the selected Organisation
  const deptRef = doc(db, 'departments', data.departmentId);
  const deptSnap = await getDoc(deptRef);
  if (!deptSnap.exists()) {
    throw new Error('Validation failed: The selected parent department does not exist.');
  }
  const deptData = deptSnap.data() as Department;
  if (deptData.organisationId !== data.organisationId) {
    throw new Error(`Validation failed: The selected department "${deptData.name}" does not belong to the selected organisation "${orgData.name}".`);
  }

  const docRef = doc(collection(db, 'units'));
  const now = new Date().toISOString();
  const unit: Unit = {
    ...data,
    organisationName: data.organisationName || orgData.name,
    departmentName: data.departmentName || deptData.name,
    id: docRef.id,
    slug: data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    status: data.status || 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: actor.id
  };
  await setDoc(docRef, unit);

  // Update unit count on parent department
  try {
    await updateDoc(deptRef, {
      unitCount: increment(1),
      updatedAt: now
    });
  } catch (e) {
    console.warn('Could not increment dept unit count', e);
  }

  dbCache.invalidate('units');
  dbCache.invalidate('depts');
  await logAuditEvent(actor, 'Created Unit', 'unit', unit.id, `Created unit ${unit.name} under department ${deptData.name} (${orgData.name})`, unit);
  return unit;
}

export async function updateUnit(
  id: string,
  data: Partial<Unit>,
  actor: { id: string; name: string; email?: string }
): Promise<void> {
  const docRef = doc(db, 'units', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error('Unit not found');
  }
  const existing = snap.data() as Unit;
  const targetOrgId = data.organisationId || existing.organisationId;
  const targetDeptId = data.departmentId || existing.departmentId;

  let resolvedOrgName = data.organisationName || existing.organisationName;
  let resolvedDeptName = data.departmentName || existing.departmentName;

  if (data.organisationId || data.departmentId) {
    const orgRef = doc(db, 'organisations', targetOrgId);
    const orgSnap = await getDoc(orgRef);
    if (orgSnap.exists()) {
      resolvedOrgName = (orgSnap.data() as Organisation).name;
    }

    const deptRef = doc(db, 'departments', targetDeptId);
    const deptSnap = await getDoc(deptRef);
    if (!deptSnap.exists()) {
      throw new Error('Validation failed: The specified parent department does not exist.');
    }
    const deptData = deptSnap.data() as Department;
    if (deptData.organisationId !== targetOrgId) {
      throw new Error(`Validation failed: The selected department "${deptData.name}" does not belong to the selected organisation.`);
    }
    resolvedDeptName = deptData.name;
  }

  const now = new Date().toISOString();
  await updateDoc(docRef, {
    ...data,
    organisationName: resolvedOrgName,
    departmentName: resolvedDeptName,
    updatedAt: now
  });
  dbCache.invalidate('units');
  dbCache.invalidate(`unit_doc_${id}`);
  await logAuditEvent(actor, 'Updated Unit', 'unit', id, `Updated unit ${data.name || existing.name}`, data);
}

export async function archiveUnit(
  id: string,
  actor: { id: string; name: string; email?: string }
): Promise<void> {
  const docRef = doc(db, 'units', id);
  const snap = await getDoc(docRef);
  const unit = snap.data() as Unit | undefined;
  const now = new Date().toISOString();

  await updateDoc(docRef, {
    status: 'archived',
    updatedAt: now
  });

  if (unit?.departmentId) {
    try {
      const deptRef = doc(db, 'departments', unit.departmentId);
      await updateDoc(deptRef, {
        unitCount: increment(-1),
        updatedAt: now
      });
    } catch (e) {
      // ignore
    }
  }

  dbCache.invalidate('units');
  dbCache.invalidate(`unit_doc_${id}`);
  await logAuditEvent(actor, 'Archived Unit', 'unit', id, `Archived unit ${id}`);
}

export async function deleteUnit(
  id: string,
  actor: { id: string; name: string; email?: string; role?: string }
): Promise<void> {
  assertSuperAdmin(actor, 'units');
  const docRef = doc(db, 'units', id);
  const snap = await getDoc(docRef);
  const unit = snap.data() as Unit | undefined;
  await deleteDoc(docRef);

  if (unit?.departmentId) {
    try {
      const deptRef = doc(db, 'departments', unit.departmentId);
      await updateDoc(deptRef, {
        unitCount: increment(-1),
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      // ignore
    }
  }

  dbCache.invalidate('units');
  dbCache.invalidate(`unit_doc_${id}`);
  await logAuditEvent(actor, 'Deleted Unit', 'unit', id, `Super Admin permanently deleted unit ${id}`);
}

// ==========================================
// MEMBERSHIPS & HIERARCHY VALIDATION
// ==========================================
/**
 * Server-side hierarchy validator:
 * Organisation -> Department -> Unit
 * - If departmentId exists: Department must belong to Organisation
 * - If unitId exists: Unit must belong to Department AND Unit must belong to Organisation
 */
export async function validateMembershipHierarchy(data: {
  organisationId: string;
  departmentId?: string;
  unitId?: string;
}): Promise<{ organisationName: string; departmentName?: string; unitName?: string }> {
  if (!data.organisationId) {
    throw new Error('Validation failed: Organisation is required for membership.');
  }

  // 1. Fetch & validate Organisation
  const orgSnap = await getDoc(doc(db, 'organisations', data.organisationId));
  if (!orgSnap.exists()) {
    throw new Error('Validation failed: The selected organisation does not exist.');
  }
  const orgData = orgSnap.data() as Organisation;

  let departmentName: string | undefined = undefined;
  let unitName: string | undefined = undefined;

  // 2. If departmentId exists: Department must belong to Organisation
  if (data.departmentId) {
    const deptSnap = await getDoc(doc(db, 'departments', data.departmentId));
    if (!deptSnap.exists()) {
      throw new Error('Validation failed: The selected department does not exist.');
    }
    const deptData = deptSnap.data() as Department;
    if (deptData.organisationId !== data.organisationId) {
      throw new Error(
        `Validation failed: Department "${deptData.name}" does not belong to the selected organisation "${orgData.name}".`
      );
    }
    departmentName = deptData.name;
  }

  // 3. If unitId exists: Unit must belong to Department AND Unit must belong to Organisation
  if (data.unitId) {
    if (!data.departmentId) {
      throw new Error('Validation failed: A unit must belong to a parent department.');
    }
    const unitSnap = await getDoc(doc(db, 'units', data.unitId));
    if (!unitSnap.exists()) {
      throw new Error('Validation failed: The selected unit does not exist.');
    }
    const unitData = unitSnap.data() as Unit;
    if (unitData.departmentId !== data.departmentId) {
      throw new Error(
        `Validation failed: Unit "${unitData.name}" does not belong to the selected department "${departmentName}".`
      );
    }
    if (unitData.organisationId !== data.organisationId) {
      throw new Error(
        `Validation failed: Unit "${unitData.name}" does not belong to the selected organisation "${orgData.name}".`
      );
    }
    unitName = unitData.name;
  }

  return {
    organisationName: orgData.name,
    departmentName,
    unitName
  };
}

export async function getMemberships(filters?: {
  personId?: string;
  organisationId?: string;
  departmentId?: string;
  unitId?: string;
  status?: 'active' | 'inactive';
}, forceRefresh = false): Promise<Membership[]> {
  const cacheKey = `memberships_${filters?.personId || 'all'}_${filters?.organisationId || 'all'}_${filters?.departmentId || 'all'}_${filters?.unitId || 'all'}_${filters?.status || 'all'}`;
  if (!forceRefresh) {
    const cached = dbCache.get<Membership[]>(cacheKey);
    if (cached) return cached;
  }

  try {
    const ref = collection(db, 'memberships');
    let snap;
    if (filters?.personId) {
      snap = await getDocs(query(ref, where('personId', '==', filters.personId)));
    } else if (filters?.organisationId) {
      snap = await getDocs(query(ref, where('organisationId', '==', filters.organisationId)));
    } else {
      snap = await getDocs(ref);
    }
    let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Membership));

    if (filters?.personId) {
      list = list.filter(m => m.personId === filters.personId);
    }
    if (filters?.organisationId) {
      list = list.filter(m => m.organisationId === filters.organisationId);
    }
    if (filters?.departmentId) {
      list = list.filter(m => m.departmentId === filters.departmentId);
    }
    if (filters?.unitId) {
      list = list.filter(m => m.unitId === filters.unitId);
    }
    if (filters?.status) {
      list = list.filter(m => m.status === filters.status);
    }

    dbCache.set(cacheKey, list, 14400000); // 4 hours TTL
    return list;
  } catch (error) {
    console.error('Error fetching memberships:', error);
    return [];
  }
}

export async function getMembershipsByPerson(personId: string, forceRefresh = false): Promise<Membership[]> {
  return getMemberships({ personId }, forceRefresh);
}

export async function createMembership(
  data: Omit<Membership, 'id' | 'createdAt' | 'updatedAt'>,
  actor: { id: string; name: string; email?: string }
): Promise<Membership> {
  const personSnap = await getDoc(doc(db, 'people', data.personId));
  if (!personSnap.exists()) {
    throw new Error('Validation failed: Person does not exist.');
  }

  // Server-side hierarchy validation
  const resolved = await validateMembershipHierarchy({
    organisationId: data.organisationId,
    departmentId: data.departmentId,
    unitId: data.unitId
  });

  const docRef = doc(collection(db, 'memberships'));
  const now = new Date().toISOString();

  const membership: Membership = {
    id: docRef.id,
    personId: data.personId,
    organisationId: data.organisationId,
    organisationName: resolved.organisationName,
    departmentId: data.departmentId || undefined,
    departmentName: resolved.departmentName || undefined,
    unitId: data.unitId || undefined,
    unitName: resolved.unitName || undefined,
    roleTitle: data.roleTitle || '',
    status: data.status || 'active',
    createdAt: now,
    updatedAt: now
  };

  try {
    await setDoc(docRef, cleanFirestoreData(membership));
    dbCache.invalidate('memberships');
    dbCache.invalidate('people');
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `memberships/${docRef.id}`);
  }

  await logAuditEvent(
    actor,
    'Created Membership',
    'membership',
    membership.id,
    `Added membership for person ${data.personId} in ${resolved.organisationName}${
      resolved.departmentName ? ' / ' + resolved.departmentName : ''
    }${resolved.unitName ? ' / ' + resolved.unitName : ''}`,
    membership
  );

  return membership;
}

export async function updateMembership(
  id: string,
  data: Partial<Membership>,
  actor: { id: string; name: string; email?: string }
): Promise<void> {
  const docRef = doc(db, 'memberships', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error('Membership not found.');
  }
  const existing = snap.data() as Membership;

  const targetOrgId = data.organisationId || existing.organisationId;
  const targetDeptId = data.departmentId !== undefined ? data.departmentId : existing.departmentId;
  const targetUnitId = data.unitId !== undefined ? data.unitId : existing.unitId;

  let resolvedOrgName = existing.organisationName;
  let resolvedDeptName = existing.departmentName;
  let resolvedUnitName = existing.unitName;

  if (data.organisationId || data.departmentId !== undefined || data.unitId !== undefined) {
    const resolved = await validateMembershipHierarchy({
      organisationId: targetOrgId,
      departmentId: targetDeptId,
      unitId: targetUnitId
    });
    resolvedOrgName = resolved.organisationName;
    resolvedDeptName = resolved.departmentName;
    resolvedUnitName = resolved.unitName;
  }

  const now = new Date().toISOString();
  try {
    await updateDoc(docRef, {
      ...data,
      organisationId: targetOrgId,
      organisationName: resolvedOrgName,
      departmentId: targetDeptId || deleteField(),
      departmentName: resolvedDeptName || deleteField(),
      unitId: targetUnitId || deleteField(),
      unitName: resolvedUnitName || deleteField(),
      updatedAt: now
    });
    dbCache.invalidate('memberships');
    dbCache.invalidate('people');
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `memberships/${id}`);
  }

  await logAuditEvent(actor, 'Updated Membership', 'membership', id, `Updated membership record ${id}`, data);
}

export async function deleteMembership(
  id: string,
  actor: { id: string; name: string; email?: string; role?: string }
): Promise<void> {
  assertSuperAdmin(actor, 'memberships');
  const docRef = doc(db, 'memberships', id);
  try {
    await deleteDoc(docRef);
    dbCache.invalidate('memberships');
    dbCache.invalidate('people');
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `memberships/${id}`);
  }
  await logAuditEvent(actor, 'Deleted Membership', 'membership', id, `Removed membership record ${id}`);
}

// ==========================================
// PEOPLE / VOTERS CMS
// ==========================================
export function generateVoterCode(prefix = 'VOTE'): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
}

export async function getPeople(
  orgOrIncludeArchived?: string | boolean,
  departmentId?: string,
  unitIdOrIncludeArchived?: string | boolean,
  includeArchived = false,
  forceRefresh = false
): Promise<Person[]> {
  let orgId: string | undefined = undefined;
  let unitId: string | undefined = undefined;
  let incArch = includeArchived;

  if (typeof orgOrIncludeArchived === 'boolean') {
    incArch = orgOrIncludeArchived;
  } else if (typeof orgOrIncludeArchived === 'string') {
    orgId = orgOrIncludeArchived;
  }

  if (typeof unitIdOrIncludeArchived === 'boolean') {
    incArch = unitIdOrIncludeArchived;
  } else if (typeof unitIdOrIncludeArchived === 'string') {
    unitId = unitIdOrIncludeArchived;
  }

  const masterKey = 'people_master';
  if (!forceRefresh) {
    const masterPeople = dbCache.get<Person[]>(masterKey);
    if (masterPeople) {
      let people = masterPeople;
      if (orgId && orgId !== 'all') {
        people = people.filter(p =>
          p.organisationId === orgId ||
          p.memberships?.some(m => m.organisationId === orgId && m.status === 'active')
        );
      }
      if (departmentId && departmentId !== 'all') {
        people = people.filter(p =>
          p.departmentId === departmentId ||
          p.memberships?.some(m => m.departmentId === departmentId && m.status === 'active')
        );
      }
      if (unitId && unitId !== 'all') {
        people = people.filter(p =>
          p.unitId === unitId ||
          p.memberships?.some(m => m.unitId === unitId && m.status === 'active')
        );
      }
      if (!incArch) {
        people = people.filter(p => p.status !== 'archived');
      }
      return people;
    }
  }

  return dbCache.dedupe(masterKey, async () => {
    try {
      const [peopleSnap, membershipsSnap] = await Promise.all([
        getDocs(collection(db, 'people')),
        getDocs(collection(db, 'memberships'))
      ]);

      const membershipsByPerson: Record<string, Membership[]> = {};
      membershipsSnap.docs.forEach(d => {
        const m = { id: d.id, ...d.data() } as Membership;
        if (!membershipsByPerson[m.personId]) {
          membershipsByPerson[m.personId] = [];
        }
        membershipsByPerson[m.personId].push(m);
      });

      let allPeople = peopleSnap.docs.map(doc => {
        const data = doc.data() as Person;
        const personMemberships = membershipsByPerson[doc.id] || [];
        return {
          id: doc.id,
          ...data,
          memberships: personMemberships
        } as Person;
      });

      allPeople.sort((a, b) => a.fullName.localeCompare(b.fullName));
      dbCache.set(masterKey, allPeople, 14400000); // 4 hours TTL

      let people = allPeople;
      if (orgId && orgId !== 'all') {
        people = people.filter(p =>
          p.organisationId === orgId ||
          p.memberships?.some(m => m.organisationId === orgId && m.status === 'active')
        );
      }
      if (departmentId && departmentId !== 'all') {
        people = people.filter(p =>
          p.departmentId === departmentId ||
          p.memberships?.some(m => m.departmentId === departmentId && m.status === 'active')
        );
      }
      if (unitId && unitId !== 'all') {
        people = people.filter(p =>
          p.unitId === unitId ||
          p.memberships?.some(m => m.unitId === unitId && m.status === 'active')
        );
      }
      if (!incArch) {
        people = people.filter(p => p.status !== 'archived');
      }
      return people;
    } catch (error) {
      console.error('Error fetching people:', error);
      return [];
    }
  });
}

export async function getPersonById(id: string, forceRefresh = false): Promise<Person | null> {
  if (!forceRefresh) {
    const master = dbCache.get<Person[]>('people_master');
    if (master) {
      const found = master.find(p => p.id === id);
      if (found) return found;
    }
    const cached = dbCache.get<Person>(`person_doc_${id}`);
    if (cached) return cached;
  }

  return dbCache.dedupe(`person_doc_${id}`, async () => {
    try {
      const docRef = doc(db, 'people', id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        return null;
      }
      const person = { id: snap.id, ...snap.data() } as Person;
      const memberships = await getMembershipsByPerson(id, forceRefresh);
      person.memberships = memberships;
      dbCache.set(`person_doc_${id}`, person, 14400000); // 4 hours TTL
      return person;
    } catch (error) {
      console.error(`Error fetching person ${id}:`, error);
      return null;
    }
  });
}

export async function getPersonByVoterCode(code: string, forceRefresh = false): Promise<Person | null> {
  const normalizedCode = code.trim().toUpperCase();
  const cacheKey = `voter_${normalizedCode}`;
  if (!forceRefresh) {
    const master = dbCache.get<Person[]>('people_master');
    if (master) {
      const found = master.find(p => p.voterCode?.trim().toUpperCase() === normalizedCode);
      if (found) return found;
    }
    const cached = dbCache.get<Person>(cacheKey);
    if (cached) return cached;
  }

  return dbCache.dedupe(cacheKey, async () => {
    try {
      const peopleRef = collection(db, 'people');
      const q = query(peopleRef, where('voterCode', '==', normalizedCode));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const person = { id: docSnap.id, ...docSnap.data() } as Person;
        person.memberships = await getMembershipsByPerson(docSnap.id, forceRefresh);
        dbCache.set(cacheKey, person, 14400000); // 4 hours TTL
        return person;
      }
      return null;
    } catch (error) {
      console.error('Error fetching person by voter code:', error);
      return null;
    }
  });
}

export async function createPerson(
  data: Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'voterCode'> & { voterCode?: string },
  actor: { id: string; name: string; email?: string }
): Promise<Person> {
  // If an initial organisation is provided, validate hierarchy
  if (data.organisationId) {
    const resolved = await validateMembershipHierarchy({
      organisationId: data.organisationId,
      departmentId: data.departmentId,
      unitId: data.unitId
    });
    data.organisationName = resolved.organisationName;
    data.departmentName = resolved.departmentName;
    data.unitName = resolved.unitName;
  }

  const docRef = doc(collection(db, 'people'));
  const now = new Date().toISOString();
  const person: Person = {
    ...data,
    id: docRef.id,
    voterCode: data.voterCode || generateVoterCode(),
    status: data.status || 'active',
    createdAt: now,
    updatedAt: now
  };
  await setDoc(docRef, cleanFirestoreData(person));

  // Automatically create the initial Membership document
  if (data.organisationId) {
    try {
      const memRef = doc(collection(db, 'memberships'));
      const initialMembership: Membership = {
        id: memRef.id,
        personId: person.id,
        organisationId: data.organisationId,
        organisationName: data.organisationName,
        departmentId: data.departmentId || undefined,
        departmentName: data.departmentName || undefined,
        unitId: data.unitId || undefined,
        unitName: data.unitName || undefined,
        roleTitle: data.roleTitle || '',
        status: data.status === 'inactive' ? 'inactive' : 'active',
        createdAt: now,
        updatedAt: now
      };
      await setDoc(memRef, cleanFirestoreData(initialMembership));
      person.memberships = [initialMembership];
    } catch (e) {
      console.warn('Could not create initial membership record:', e);
    }
  }

  dbCache.invalidate('people');
  dbCache.invalidate('memberships');
  await logAuditEvent(actor, 'Added Person / Voter', 'person', person.id, `Added ${person.fullName}`, person);
  return person;
}

export async function updatePerson(
  id: string,
  data: Partial<Person>,
  actor: { id: string; name: string; email?: string }
): Promise<void> {
  const docRef = doc(db, 'people', id);
  const now = new Date().toISOString();
  await updateDoc(docRef, cleanFirestoreData({
    ...data,
    updatedAt: now
  }));
  dbCache.invalidate('people');
  dbCache.invalidate(`person_doc_${id}`);
  await logAuditEvent(actor, 'Updated Person', 'person', id, `Updated person info for ${data.fullName || id}`, data);
}

export async function archivePerson(
  id: string,
  actor: { id: string; name: string; email?: string }
): Promise<void> {
  const docRef = doc(db, 'people', id);
  const now = new Date().toISOString();
  await updateDoc(docRef, {
    status: 'archived',
    updatedAt: now
  });
  dbCache.invalidate('people');
  dbCache.invalidate(`person_doc_${id}`);
  await logAuditEvent(actor, 'Archived Person', 'person', id, `Archived member/voter record ID: ${id}`);
}

export async function deletePerson(
  id: string,
  actor: { id: string; name: string; email?: string; role?: string }
): Promise<void> {
  assertSuperAdmin(actor, 'church member/voter records');
  const docRef = doc(db, 'people', id);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `people/${id}`);
  }

  // Also remove all memberships for this person
  try {
    const mems = await getMembershipsByPerson(id);
    if (mems.length > 0) {
      const batch = writeBatch(db);
      mems.forEach(m => {
        batch.delete(doc(db, 'memberships', m.id));
      });
      await batch.commit();
    }
  } catch (e) {
    console.warn('Could not clean up memberships on person deletion:', e);
  }

  dbCache.invalidate('people');
  dbCache.invalidate('memberships');
  dbCache.invalidate(`person_doc_${id}`);
  await logAuditEvent(actor, 'Deleted Person Record', 'person', id, `Permanently deleted member/voter ID: ${id}`);
}

export async function batchCreatePeople(
  peopleList: Array<Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'voterCode'>>,
  actor: { id: string; name: string; email?: string }
): Promise<number> {
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  let count = 0;

  for (const item of peopleList) {
    const docRef = doc(collection(db, 'people'));
    const person: Person = {
      ...item,
      id: docRef.id,
      voterCode: generateVoterCode(),
      status: item.status || 'active',
      createdAt: now,
      updatedAt: now
    };
    batch.set(docRef, person);
    count++;
  }

  await batch.commit();
  dbCache.invalidate('people');
  dbCache.invalidate('memberships');
  await logAuditEvent(actor, 'Batch Added People', 'person', 'batch', `Batch imported ${count} people / voters`);
  return count;
}

// ==========================================
// VOTING EXERCISES CMS
// ==========================================
export async function getVotingExercises(filters?: {
  organisationId?: string;
  departmentId?: string;
  status?: ExerciseStatus;
  includeArchived?: boolean;
}, forceRefresh = false): Promise<VotingExercise[]> {
  const masterKey = 'exercises_master';
  if (!forceRefresh) {
    const cachedMaster = dbCache.get<VotingExercise[]>(masterKey);
    if (cachedMaster) {
      const nowISO = new Date().toISOString();
      let exercises = cachedMaster.map(e => {
        if (e.status === 'scheduled' && e.startTime <= nowISO && e.endTime > nowISO) {
          return { ...e, status: 'open' as ExerciseStatus };
        }
        if (e.status === 'open' && e.endTime <= nowISO) {
          return { ...e, status: 'closed' as ExerciseStatus };
        }
        return e;
      });

      if (filters?.organisationId) {
        exercises = exercises.filter(e => e.organisationId === filters.organisationId);
      }
      if (filters?.departmentId) {
        exercises = exercises.filter(e => e.departmentId === filters.departmentId);
      }
      if (filters?.status) {
        exercises = exercises.filter(e => e.status === filters.status);
      }
      if (!filters?.includeArchived) {
        exercises = exercises.filter(e => e.status !== 'archived');
      }
      return exercises;
    }
  }

  return dbCache.dedupe(masterKey, async () => {
    try {
      const ref = collection(db, 'votingExercises');
      const snap = await getDocs(ref);
      let exercises = snap.docs.map(d => ({ id: d.id, ...d.data() } as VotingExercise));

      // Sort by startTime descending
      exercises.sort((a, b) => new Date(b.startTime || b.createdAt).getTime() - new Date(a.startTime || a.createdAt).getTime());
      dbCache.set(masterKey, exercises, 14400000); // 4 hours TTL with dynamic client-side open/closed calculation

      const nowISO = new Date().toISOString();
      exercises = exercises.map(e => {
        if (e.status === 'scheduled' && e.startTime <= nowISO && e.endTime > nowISO) {
          return { ...e, status: 'open' as ExerciseStatus };
        }
        if (e.status === 'open' && e.endTime <= nowISO) {
          return { ...e, status: 'closed' as ExerciseStatus };
        }
        return e;
      });

      if (filters?.organisationId) {
        exercises = exercises.filter(e => e.organisationId === filters.organisationId);
      }
      if (filters?.departmentId) {
        exercises = exercises.filter(e => e.departmentId === filters.departmentId);
      }
      if (filters?.status) {
        exercises = exercises.filter(e => e.status === filters.status);
      }
      if (!filters?.includeArchived) {
        exercises = exercises.filter(e => e.status !== 'archived');
      }

      return exercises;
    } catch (error) {
      console.warn('Error getting voting exercises (serving cached data):', error);
      const stale = dbCache.getStale<VotingExercise[]>(masterKey);
      if (stale && stale.length > 0) {
        let exercises = stale;
        if (filters?.organisationId) {
          exercises = exercises.filter(e => e.organisationId === filters.organisationId);
        }
        if (filters?.departmentId) {
          exercises = exercises.filter(e => e.departmentId === filters.departmentId);
        }
        if (filters?.status) {
          exercises = exercises.filter(e => e.status === filters.status);
        }
        if (!filters?.includeArchived) {
          exercises = exercises.filter(e => e.status !== 'archived');
        }
        return exercises;
      }
      return [];
    }
  });
}

export async function getVotingExerciseById(id: string, forceRefresh = false): Promise<VotingExercise | null> {
  if (!forceRefresh) {
    const master = dbCache.get<VotingExercise[]>('exercises_master');
    if (master) {
      const found = master.find(e => e.id === id);
      if (found) {
        const nowISO = new Date().toISOString();
        const copy = { ...found };
        if (copy.status === 'scheduled' && copy.startTime <= nowISO && copy.endTime > nowISO) {
          copy.status = 'open';
        } else if (copy.status === 'open' && copy.endTime <= nowISO) {
          copy.status = 'closed';
        }
        return copy;
      }
    }
    const cached = dbCache.get<VotingExercise>(`exercise_doc_${id}`);
    if (cached) return cached;
  }

  return dbCache.dedupe(`exercise_doc_${id}`, async () => {
    try {
      const docRef = doc(db, 'votingExercises', id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;

      const data = { id: snap.id, ...snap.data() } as VotingExercise;
      const nowISO = new Date().toISOString();

      // Check automatic status transition
      if (data.status === 'scheduled' && data.startTime <= nowISO && data.endTime > nowISO) {
        data.status = 'open';
      } else if (data.status === 'open' && data.endTime <= nowISO) {
        data.status = 'closed';
      }

      dbCache.set(`exercise_doc_${id}`, data, 14400000); // 4 hours TTL in persistent storage
      return data;
    } catch (error) {
      console.error(`Error getting voting exercise ${id}:`, error);
      const stale = dbCache.getStale<VotingExercise>(`exercise_doc_${id}`);
      if (stale) return stale;
      return null;
    }
  });
}

/**
 * Server-side Scope Validation for Voting Exercises:
 * - Church / Workforce: organisationId, departmentId, unitId not required
 * - Organisation: organisationId is required
 * - Department: organisationId, departmentId are required. Department must belong to Organisation.
 * - Unit: organisationId, departmentId, unitId are required.
 *   Unit must belong to Department AND Unit must belong to Organisation.
 */
export async function validateVotingExerciseScope(data: {
  scopeType: VotingScopeType;
  organisationId?: string;
  departmentId?: string;
  unitId?: string;
}): Promise<{
  organisationId?: string;
  organisationName?: string;
  departmentId?: string;
  departmentName?: string;
  unitId?: string;
  unitName?: string;
}> {
  const { scopeType, organisationId, departmentId, unitId } = data;

  if (scopeType === 'church') {
    return {
      organisationName: 'Entire Church'
    };
  }

  if (scopeType === 'workforce') {
    return {
      organisationName: 'Entire Workforce'
    };
  }

  if (scopeType === 'custom') {
    return {
      organisationId: organisationId || undefined,
      departmentId: departmentId || undefined,
      unitId: unitId || undefined,
      organisationName: 'Custom Group'
    };
  }

  if (scopeType === 'organisation') {
    if (!organisationId) {
      throw new Error('Validation failed: Organisation is required for Organisation Scope.');
    }
    const orgSnap = await getDoc(doc(db, 'organisations', organisationId));
    if (!orgSnap.exists()) {
      throw new Error('Validation failed: The selected organisation does not exist.');
    }
    const orgData = orgSnap.data() as Organisation;
    return {
      organisationId,
      organisationName: orgData.name
    };
  }

  if (scopeType === 'department') {
    if (!organisationId) {
      throw new Error('Validation failed: Organisation is required for Department Scope.');
    }
    if (!departmentId) {
      throw new Error('Validation failed: Department is required for Department Scope.');
    }

    const orgSnap = await getDoc(doc(db, 'organisations', organisationId));
    if (!orgSnap.exists()) {
      throw new Error('Validation failed: The selected organisation does not exist.');
    }
    const orgData = orgSnap.data() as Organisation;

    const deptSnap = await getDoc(doc(db, 'departments', departmentId));
    if (!deptSnap.exists()) {
      throw new Error('Validation failed: The selected department does not exist.');
    }
    const deptData = deptSnap.data() as Department;

    if (deptData.organisationId !== organisationId) {
      throw new Error(
        `Validation failed: Selected department "${deptData.name}" does not belong to the selected organisation "${orgData.name}".`
      );
    }

    return {
      organisationId,
      organisationName: orgData.name,
      departmentId,
      departmentName: deptData.name
    };
  }

  if (scopeType === 'unit') {
    if (!organisationId) {
      throw new Error('Validation failed: Organisation is required for Unit Scope.');
    }
    if (!departmentId) {
      throw new Error('Validation failed: Department is required for Unit Scope.');
    }
    if (!unitId) {
      throw new Error('Validation failed: Unit is required for Unit Scope.');
    }

    const orgSnap = await getDoc(doc(db, 'organisations', organisationId));
    if (!orgSnap.exists()) {
      throw new Error('Validation failed: The selected organisation does not exist.');
    }
    const orgData = orgSnap.data() as Organisation;

    const deptSnap = await getDoc(doc(db, 'departments', departmentId));
    if (!deptSnap.exists()) {
      throw new Error('Validation failed: The selected department does not exist.');
    }
    const deptData = deptSnap.data() as Department;

    if (deptData.organisationId !== organisationId) {
      throw new Error(
        `Validation failed: Selected department "${deptData.name}" does not belong to the selected organisation "${orgData.name}".`
      );
    }

    const unitSnap = await getDoc(doc(db, 'units', unitId));
    if (!unitSnap.exists()) {
      throw new Error('Validation failed: The selected unit does not exist.');
    }
    const unitData = unitSnap.data() as Unit;

    if (unitData.departmentId !== departmentId) {
      throw new Error(
        `Validation failed: Selected unit "${unitData.name}" does not belong to department "${deptData.name}".`
      );
    }

    if (unitData.organisationId !== organisationId) {
      throw new Error(
        `Validation failed: Selected unit "${unitData.name}" does not belong to organisation "${orgData.name}".`
      );
    }

    return {
      organisationId,
      organisationName: orgData.name,
      departmentId,
      departmentName: deptData.name,
      unitId,
      unitName: unitData.name
    };
  }

  return {};
}

export async function createVotingExercise(
  data: Omit<VotingExercise, 'id' | 'createdAt' | 'updatedAt' | 'totalVotes' | 'createdBy' | 'scopeType'> & {
    scopeType?: VotingScopeType;
    createdBy?: string;
    criteria?: Array<{ title: string; description?: string; order: number }>;
    nominees?: Array<{ displayName: string; roleOrTitle?: string; department?: string; unit?: string; organisationName?: string; photoUrl?: string; bio?: string; personId?: string; order: number }>;
  },
  actor: { id: string; name: string; email?: string }
): Promise<VotingExercise> {
  const scopeType = data.scopeType || 'workforce';
  const validatedScope = await validateVotingExerciseScope({
    scopeType,
    organisationId: data.organisationId,
    departmentId: data.departmentId,
    unitId: data.unitId
  });

  const docRef = doc(collection(db, 'votingExercises'));
  const now = new Date().toISOString();

  const exercise: VotingExercise = {
    id: docRef.id,
    title: data.title,
    slug: data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: data.description || '',
    scopeType,
    organisationId: validatedScope.organisationId || undefined,
    organisationName: validatedScope.organisationName || data.organisationName || 'All Church',
    departmentId: validatedScope.departmentId || undefined,
    departmentName: validatedScope.departmentName || undefined,
    unitId: validatedScope.unitId || undefined,
    unitName: validatedScope.unitName || undefined,
    categoryName: data.categoryName || 'Recognition & Excellence',
    status: data.status || 'draft',
    startTime: data.startTime,
    endTime: data.endTime,
    resultsPublished: data.resultsPublished || false,
    resultsVisibilityMode: data.resultsVisibilityMode || 'admin_only',
    allowSelfVote: data.allowSelfVote ?? false,
    maxVotesPerPerson: data.maxVotesPerPerson || 1,
    votingMode: 'single_choice',
    voterSelectionMode: data.voterSelectionMode || 'scope_members',
    nomineeSelectionMode: data.nomineeSelectionMode || 'manual_selection',
    criteriaCount: data.criteria?.length || 0,
    nomineeCount: data.nominees?.length || 0,
    totalVotes: 0,
    eligibleVotersCount: data.eligibleVotersCount || 0,
    createdBy: actor.id,
    createdAt: now,
    updatedAt: now
  };

  const batch = writeBatch(db);
  batch.set(docRef, cleanFirestoreData(exercise));

  // Add initial criteria if provided
  if (data.criteria && data.criteria.length > 0) {
    for (let i = 0; i < data.criteria.length; i++) {
      const c = data.criteria[i];
      const critRef = doc(collection(db, 'votingExercises', exercise.id, 'criteria'));
      const crit: Criterion = {
        id: critRef.id,
        votingExerciseId: exercise.id,
        title: c.title,
        description: c.description || '',
        order: c.order ?? i + 1,
        active: true,
        createdAt: now,
        updatedAt: now
      };
      batch.set(critRef, crit);
    }
  }

  // Add initial nominees if provided
  if (data.nominees && data.nominees.length > 0) {
    for (let i = 0; i < data.nominees.length; i++) {
      const n = data.nominees[i];
      const nomRef = doc(collection(db, 'votingExercises', exercise.id, 'nominees'));
      const nom: Nominee = {
        id: nomRef.id,
        votingExerciseId: exercise.id,
        personId: n.personId || '',
        displayName: n.displayName,
        roleOrTitle: n.roleOrTitle || '',
        department: n.department || validatedScope.departmentName || '',
        unit: n.unit || validatedScope.unitName || '',
        organisationName: n.organisationName || validatedScope.organisationName || '',
        photoUrl: n.photoUrl || '',
        bio: n.bio || '',
        active: true,
        order: n.order ?? i + 1,
        createdAt: now,
        updatedAt: now
      };
      batch.set(nomRef, nom);
    }
  }

  await batch.commit();
  dbCache.invalidate('exercises');
  await logAuditEvent(actor, 'Created Voting Exercise', 'votingExercise', exercise.id, `Created ${exercise.title} (Scope: ${exercise.scopeType})`, exercise);
  return exercise;
}

export async function updateVotingExercise(
  id: string,
  data: Partial<VotingExercise>,
  actor: { id: string; name: string; email?: string }
): Promise<void> {
  const docRef = doc(db, 'votingExercises', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error('Voting exercise not found.');
  }
  const existing = snap.data() as VotingExercise;

  if (
    data.scopeType ||
    data.organisationId !== undefined ||
    data.departmentId !== undefined ||
    data.unitId !== undefined
  ) {
    const scopeType = data.scopeType || existing.scopeType;
    const organisationId = data.organisationId !== undefined ? data.organisationId : existing.organisationId;
    const departmentId = data.departmentId !== undefined ? data.departmentId : existing.departmentId;
    const unitId = data.unitId !== undefined ? data.unitId : existing.unitId;

    const validatedScope = await validateVotingExerciseScope({
      scopeType,
      organisationId,
      departmentId,
      unitId
    });

    data.organisationId = validatedScope.organisationId;
    data.organisationName = validatedScope.organisationName;
    data.departmentId = validatedScope.departmentId;
    data.departmentName = validatedScope.departmentName;
    data.unitId = validatedScope.unitId;
    data.unitName = validatedScope.unitName;
  }

  const now = new Date().toISOString();
  await updateDoc(docRef, cleanFirestoreData({
    ...data,
    updatedAt: now
  }));
  dbCache.invalidate('exercises');
  dbCache.invalidate(`exercise_doc_${id}`);
  dbCache.invalidate(`results_${id}`);
  await logAuditEvent(actor, 'Updated Voting Exercise', 'votingExercise', id, `Updated exercise ${data.title || id}`, data);
}

export async function setVotingExerciseStatus(
  id: string,
  status: ExerciseStatus,
  actor: { id: string; name: string; email?: string }
): Promise<void> {
  const docRef = doc(db, 'votingExercises', id);
  const now = new Date().toISOString();
  await updateDoc(docRef, {
    status,
    updatedAt: now
  });
  dbCache.invalidate('exercises');
  dbCache.invalidate(`exercise_doc_${id}`);
  dbCache.invalidate(`results_${id}`);
  await logAuditEvent(actor, `Changed Exercise Status to ${status.toUpperCase()}`, 'votingExercise', id, `Set status of exercise ${id} to ${status}`);
}

export async function toggleResultsPublished(
  id: string,
  resultsPublished: boolean,
  actor: { id: string; name: string; email?: string }
): Promise<void> {
  const docRef = doc(db, 'votingExercises', id);
  const now = new Date().toISOString();
  await updateDoc(docRef, {
    resultsPublished,
    updatedAt: now
  });
  dbCache.invalidate('exercises');
  dbCache.invalidate(`exercise_doc_${id}`);
  dbCache.invalidate(`results_${id}`);
  await logAuditEvent(
    actor,
    resultsPublished ? 'Published Voting Results' : 'Unpublished Voting Results',
    'votingExercise',
    id,
    `Results for exercise ${id} are now ${resultsPublished ? 'PUBLIC' : 'HIDDEN'}`
  );
}

export async function extendVotingPeriod(
  id: string,
  newEndTime: string,
  options: { reopenIfClosed?: boolean; reason?: string },
  actor: { id: string; name: string; email?: string }
): Promise<VotingExercise> {
  const docRef = doc(db, 'votingExercises', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error('Voting exercise not found.');
  }
  const existing = snap.data() as VotingExercise;
  const now = new Date().toISOString();

  const updates: Partial<VotingExercise> = {
    endTime: newEndTime,
    updatedAt: now
  };

  if (options.reopenIfClosed && (existing.status === 'closed' || existing.status === 'scheduled')) {
    updates.status = 'open';
  }

  await updateDoc(docRef, cleanFirestoreData(updates));
  dbCache.invalidate('exercises');
  dbCache.invalidate(`exercise_doc_${id}`);
  dbCache.invalidate(`results_${id}`);

  const previousFormatted = new Date(existing.endTime).toLocaleString();
  const newFormatted = new Date(newEndTime).toLocaleString();
  const details = `Extended voting period for "${existing.title}" from ${previousFormatted} to ${newFormatted}${
    options.reason ? ` (Reason: ${options.reason})` : ''
  }${updates.status ? ` and set status to ${updates.status.toUpperCase()}` : ''}`;

  await logAuditEvent(
    actor,
    'Extended Voting Period',
    'votingExercise',
    id,
    details,
    {
      previousEndTime: existing.endTime,
      newEndTime,
      status: updates.status || existing.status,
      reason: options.reason || ''
    }
  );

  return {
    ...existing,
    ...updates
  };
}

export async function deleteVotingExercise(
  id: string,
  actor: { id: string; name: string; email?: string; role?: string }
): Promise<void> {
  assertSuperAdmin(actor, 'a voting cycle');

  const docRef = doc(db, 'votingExercises', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error('Voting cycle not found or has already been deleted.');
  }
  const exerciseData = snap.data() as VotingExercise;

  // Clean up all subcollections: criteria, nominees, eligibility, votes
  const subcollections = ['criteria', 'nominees', 'eligibility', 'votes'];
  for (const subcol of subcollections) {
    try {
      const subSnap = await getDocs(collection(db, 'votingExercises', id, subcol));
      if (!subSnap.empty) {
        const docs = subSnap.docs;
        for (let i = 0; i < docs.length; i += 400) {
          const batch = writeBatch(db);
          const chunk = docs.slice(i, i + 400);
          chunk.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      }
    } catch (err) {
      console.warn(`Could not clean up subcollection ${subcol} for exercise ${id}:`, err);
    }
  }

  // Delete the voting exercise document itself
  await deleteDoc(docRef);

  // Invalidate all associated caches
  dbCache.invalidate('exercises');
  dbCache.invalidate(`exercise_doc_${id}`);
  dbCache.invalidate(`criteria_${id}`);
  dbCache.invalidate(`nominees_${id}`);
  dbCache.invalidate(`results_${id}`);
  dbCache.invalidate(`eligibility_${id}`);

  // Record thorough audit log
  await logAuditEvent(
    actor,
    'Deleted Voting Exercise',
    'votingExercise',
    id,
    `Super Administrator permanently deleted voting cycle "${exerciseData.title || id}" (Status: ${exerciseData.status?.toUpperCase() || 'UNKNOWN'}, Total Votes: ${exerciseData.totalVotes || 0}) and cleaned up all linked criteria, nominees, eligibility records, and ballots.`,
    {
      title: exerciseData.title,
      statusAtDeletion: exerciseData.status,
      totalVotes: exerciseData.totalVotes || 0,
      scopeType: exerciseData.scopeType,
      organisationId: exerciseData.organisationId,
      departmentId: exerciseData.departmentId,
      unitId: exerciseData.unitId
    }
  );
}

// ==========================================
// CRITERIA CMS
// ==========================================
export async function getCriteria(exerciseId: string, activeOnly = false, forceRefresh = false): Promise<Criterion[]> {
  const cacheKey = `criteria_${exerciseId}_${activeOnly}`;
  if (!forceRefresh) {
    const cached = dbCache.get<Criterion[]>(cacheKey);
    if (cached) return cached;
  }

  return dbCache.dedupe(cacheKey, async () => {
    try {
      const ref = collection(db, 'votingExercises', exerciseId, 'criteria');
      const snap = await getDocs(ref);
      let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Criterion));
      if (activeOnly) {
        list = list.filter(c => c.active !== false);
      }
      list.sort((a, b) => a.order - b.order);
      dbCache.set(cacheKey, list, 14400000); // 4 hours TTL in persistent storage
      return list;
    } catch (error) {
      console.error(`Error getting criteria for exercise ${exerciseId}:`, error);
      const stale = dbCache.getStale<Criterion[]>(cacheKey);
      if (stale) return stale;
      return [];
    }
  });
}

export async function addCriterion(
  exerciseId: string,
  data: { title: string; description?: string; order?: number },
  actor: { id: string; name: string; email?: string }
): Promise<Criterion> {
  const ref = doc(collection(db, 'votingExercises', exerciseId, 'criteria'));
  const now = new Date().toISOString();

  // Find max order
  const existing = await getCriteria(exerciseId);
  const nextOrder = data.order ?? (existing.length > 0 ? Math.max(...existing.map(c => c.order)) + 1 : 1);

  const criterion: Criterion = {
    id: ref.id,
    votingExerciseId: exerciseId,
    title: data.title,
    description: data.description || '',
    order: nextOrder,
    active: true,
    createdAt: now,
    updatedAt: now
  };
  await setDoc(ref, criterion);

  // Update criteria count
  await updateDoc(doc(db, 'votingExercises', exerciseId), {
    criteriaCount: increment(1),
    updatedAt: now
  });

  dbCache.invalidate(`criteria_${exerciseId}`);
  dbCache.invalidate('exercises');
  await logAuditEvent(actor, 'Added Voting Criterion', 'criterion', criterion.id, `Added "${criterion.title}" to exercise ${exerciseId}`);
  return criterion;
}

export async function updateCriterion(
  exerciseId: string,
  criterionId: string,
  data: Partial<Criterion>,
  actor: { id: string; name: string; email?: string }
): Promise<void> {
  const ref = doc(db, 'votingExercises', exerciseId, 'criteria', criterionId);
  const now = new Date().toISOString();
  await updateDoc(ref, {
    ...data,
    updatedAt: now
  });
  dbCache.invalidate(`criteria_${exerciseId}`);
  await logAuditEvent(actor, 'Updated Criterion', 'criterion', criterionId, `Updated criterion in exercise ${exerciseId}`, data);
}

export async function deleteCriterion(
  exerciseId: string,
  criterionId: string,
  actor: { id: string; name: string; email?: string; role?: string }
): Promise<void> {
  assertSuperAdmin(actor, 'voting criteria');
  const ref = doc(db, 'votingExercises', exerciseId, 'criteria', criterionId);
  await deleteDoc(ref);
  const now = new Date().toISOString();
  await updateDoc(doc(db, 'votingExercises', exerciseId), {
    criteriaCount: increment(-1),
    updatedAt: now
  });
  dbCache.invalidate(`criteria_${exerciseId}`);
  dbCache.invalidate('exercises');
  await logAuditEvent(actor, 'Deleted Criterion', 'criterion', criterionId, `Deleted criterion from exercise ${exerciseId}`);
}

export async function reorderCriteria(
  exerciseId: string,
  orderedIds: string[],
  actor: { id: string; name: string; email?: string }
): Promise<void> {
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  orderedIds.forEach((id, index) => {
    const ref = doc(db, 'votingExercises', exerciseId, 'criteria', id);
    batch.update(ref, { order: index + 1, updatedAt: now });
  });
  await batch.commit();
  dbCache.invalidate(`criteria_${exerciseId}`);
  await logAuditEvent(actor, 'Reordered Criteria', 'criterion', exerciseId, `Reordered criteria for exercise ${exerciseId}`);
}

// ==========================================
// NOMINEES CMS
// ==========================================
export async function getNominees(exerciseId: string, activeOnly = false, forceRefresh = false): Promise<Nominee[]> {
  const cacheKey = `nominees_${exerciseId}_${activeOnly}`;
  if (!forceRefresh) {
    const cached = dbCache.get<Nominee[]>(cacheKey);
    if (cached) return cached;
  }

  return dbCache.dedupe(cacheKey, async () => {
    try {
      const ref = collection(db, 'votingExercises', exerciseId, 'nominees');
      const snap = await getDocs(ref);
      let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Nominee));
      if (activeOnly) {
        list = list.filter(n => n.active !== false);
      }
      list.sort((a, b) => a.order - b.order);
      dbCache.set(cacheKey, list, 14400000); // 4 hours TTL in persistent storage
      return list;
    } catch (error) {
      console.error(`Error getting nominees for exercise ${exerciseId}:`, error);
      const stale = dbCache.getStale<Nominee[]>(cacheKey);
      if (stale) return stale;
      return [];
    }
  });
}

export async function addNominee(
  exerciseId: string,
  data: {
    displayName: string;
    personId?: string;
    roleOrTitle?: string;
    department?: string;
    photoUrl?: string;
    bio?: string;
    order?: number;
  },
  actor: { id: string; name: string; email?: string }
): Promise<Nominee> {
  const ref = doc(collection(db, 'votingExercises', exerciseId, 'nominees'));
  const now = new Date().toISOString();
  const existing = await getNominees(exerciseId);
  const nextOrder = data.order ?? (existing.length > 0 ? Math.max(...existing.map(n => n.order)) + 1 : 1);

  const exSnap = await getDoc(doc(db, 'votingExercises', exerciseId));
  const exData = exSnap.exists() ? (exSnap.data() as VotingExercise) : null;

  let resolvedPhoto = data.photoUrl || '';
  if (!resolvedPhoto && data.personId) {
    try {
      const pSnap = await getDoc(doc(db, 'people', data.personId));
      if (pSnap.exists()) {
        const pData = pSnap.data() as Person;
        resolvedPhoto = pData.photoUrl || pData.avatarUrl || '';
      }
    } catch {
      // ignore
    }
  }

  const nominee: Nominee = {
    id: ref.id,
    votingExerciseId: exerciseId,
    personId: data.personId || '',
    displayName: data.displayName,
    roleOrTitle: data.roleOrTitle || '',
    department: data.department || (exData?.scopeType === 'department' ? exData.departmentName || '' : ''),
    organisationName: (data as any).organisationName || exData?.organisationName || '',
    photoUrl: resolvedPhoto,
    bio: data.bio || '',
    active: true,
    order: nextOrder,
    createdAt: now,
    updatedAt: now
  };
  await setDoc(ref, nominee);

  // Increment nominee count
  await updateDoc(doc(db, 'votingExercises', exerciseId), {
    nomineeCount: increment(1),
    updatedAt: now
  });

  dbCache.invalidate(`nominees_${exerciseId}`);
  dbCache.invalidate(`results_${exerciseId}`);
  dbCache.invalidate('exercises');
  await logAuditEvent(actor, 'Added Nominee', 'nominee', nominee.id, `Nominated ${nominee.displayName} for exercise ${exerciseId}`, nominee);
  return nominee;
}

export async function updateNominee(
  exerciseId: string,
  nomineeId: string,
  data: Partial<Nominee>,
  actor: { id: string; name: string; email?: string }
): Promise<void> {
  const ref = doc(db, 'votingExercises', exerciseId, 'nominees', nomineeId);
  const now = new Date().toISOString();
  await updateDoc(ref, {
    ...data,
    updatedAt: now
  });
  dbCache.invalidate(`nominees_${exerciseId}`);
  dbCache.invalidate(`results_${exerciseId}`);
  await logAuditEvent(actor, 'Updated Nominee', 'nominee', nomineeId, `Updated nominee in exercise ${exerciseId}`, data);
}

export async function deleteNominee(
  exerciseId: string,
  nomineeId: string,
  actor: { id: string; name: string; email?: string; role?: string }
): Promise<void> {
  assertSuperAdmin(actor, 'nominees');
  const ref = doc(db, 'votingExercises', exerciseId, 'nominees', nomineeId);
  await deleteDoc(ref);
  const now = new Date().toISOString();
  await updateDoc(doc(db, 'votingExercises', exerciseId), {
    nomineeCount: increment(-1),
    updatedAt: now
  });
  dbCache.invalidate(`nominees_${exerciseId}`);
  dbCache.invalidate(`results_${exerciseId}`);
  dbCache.invalidate('exercises');
  await logAuditEvent(actor, 'Deleted Nominee', 'nominee', nomineeId, `Deleted nominee from exercise ${exerciseId}`);
}

export async function reorderNominees(
  exerciseId: string,
  orderedIds: string[],
  actor: { id: string; name: string; email?: string }
): Promise<void> {
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  orderedIds.forEach((id, index) => {
    const ref = doc(db, 'votingExercises', exerciseId, 'nominees', id);
    batch.update(ref, { order: index + 1, updatedAt: now });
  });
  await batch.commit();
  dbCache.invalidate(`nominees_${exerciseId}`);
  await logAuditEvent(actor, 'Reordered Nominees', 'nominee', exerciseId, `Reordered nominees for exercise ${exerciseId}`);
}

// ==========================================
// VOTER ELIGIBILITY CMS
// ==========================================
export async function getEligibleVotersForExercise(exerciseId: string, forceRefresh = false): Promise<Eligibility[]> {
  const cacheKey = `eligibility_${exerciseId}`;
  if (!forceRefresh) {
    const cached = dbCache.get<Eligibility[]>(cacheKey);
    if (cached) return cached;
  }

  try {
    const ref = collection(db, 'votingExercises', exerciseId, 'eligibility');
    const snap = await getDocs(ref);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Eligibility));
    dbCache.set(cacheKey, list, 1800000); // 30 mins TTL
    return list;
  } catch (error) {
    console.error(`Error getting eligibility for exercise ${exerciseId}:`, error);
    return [];
  }
}

export async function assignEligibilityBatch(
  exerciseId: string,
  people: Person[],
  actor: { id: string; name: string; email?: string }
): Promise<number> {
  let targetPeople = people;
  try {
    const exerciseSnap = await getDoc(doc(db, 'votingExercises', exerciseId));
    if (exerciseSnap.exists()) {
      const ex = exerciseSnap.data() as VotingExercise;
      if (ex.scopeType === 'department' && (ex.departmentId || ex.departmentName)) {
        const deptId = ex.departmentId;
        const deptName = ex.departmentName?.trim().toLowerCase();
        const deptMatches = people.filter((p) => {
          if (deptId && p.departmentId === deptId) return true;
          if (deptName && p.departmentName && p.departmentName.trim().toLowerCase() === deptName) return true;
          if (p.memberships && p.memberships.some((m) =>
            ((deptId && m.departmentId === deptId) || (deptName && m.departmentName && m.departmentName.trim().toLowerCase() === deptName)) &&
            m.status === 'active'
          )) return true;
          return false;
        });
        // Enforce department confinement for scope_members or whenever matches are found
        if (ex.voterSelectionMode === 'scope_members' || deptMatches.length > 0) {
          targetPeople = deptMatches;
        }
      } else if (ex.scopeType === 'unit' && (ex.unitId || ex.unitName)) {
        const uId = ex.unitId;
        const uName = ex.unitName?.trim().toLowerCase();
        const unitMatches = people.filter((p) => {
          if (uId && p.unitId === uId) return true;
          if (uName && p.unitName && p.unitName.trim().toLowerCase() === uName) return true;
          if (p.memberships && p.memberships.some((m) =>
            ((uId && m.unitId === uId) || (uName && m.unitName && m.unitName.trim().toLowerCase() === uName)) &&
            m.status === 'active'
          )) return true;
          return false;
        });
        if (ex.voterSelectionMode === 'scope_members' || unitMatches.length > 0) {
          targetPeople = unitMatches;
        }
      }
    }
  } catch (err) {
    console.warn('Could not check exercise scope in assignEligibilityBatch', err);
  }

  const batch = writeBatch(db);
  const now = new Date().toISOString();
  let count = 0;

  for (const person of targetPeople) {
    const eligRef = doc(db, 'votingExercises', exerciseId, 'eligibility', person.id);
    const item: Eligibility = {
      id: person.id,
      votingExerciseId: exerciseId,
      personId: person.id,
      voterName: person.fullName,
      voterEmail: person.email || '',
      voterCode: person.voterCode,
      eligible: true,
      hasVoted: false,
      createdAt: now,
      updatedAt: now
    };
    batch.set(eligRef, item, { merge: true });
    count++;
  }

  await batch.commit();

  // Count total eligible voters
  const allEligible = await getEligibleVotersForExercise(exerciseId);
  await updateDoc(doc(db, 'votingExercises', exerciseId), {
    eligibleVotersCount: allEligible.length,
    updatedAt: now
  });

  await logAuditEvent(actor, 'Assigned Voter Eligibility', 'eligibility', exerciseId, `Assigned eligibility to ${count} voters for exercise ${exerciseId}`);
  return count;
}

export async function removeEligibility(
  exerciseId: string,
  personId: string,
  actor: { id: string; name: string; email?: string; role?: string }
): Promise<void> {
  assertSuperAdmin(actor, 'voter eligibility records');
  const eligRef = doc(db, 'votingExercises', exerciseId, 'eligibility', personId);
  await deleteDoc(eligRef);
  const now = new Date().toISOString();
  const allEligible = await getEligibleVotersForExercise(exerciseId);
  await updateDoc(doc(db, 'votingExercises', exerciseId), {
    eligibleVotersCount: allEligible.length,
    updatedAt: now
  });
  await logAuditEvent(actor, 'Removed Voter Eligibility', 'eligibility', personId, `Removed eligibility for voter ${personId} in exercise ${exerciseId}`);
}

export async function checkVoterEligibility(
  exerciseId: string,
  personId: string,
  forceRefresh = false
): Promise<{ eligible: boolean; hasVoted: boolean; eligibilityDoc?: Eligibility }> {
  const cacheKey = `elig_check_${exerciseId}_${personId}`;
  if (!forceRefresh) {
    const cached = dbCache.get<{ eligible: boolean; hasVoted: boolean; eligibilityDoc?: Eligibility }>(cacheKey);
    if (cached) return cached;
  }

  return dbCache.dedupe(cacheKey, async () => {
    try {
      const eligRef = doc(db, 'votingExercises', exerciseId, 'eligibility', personId);
      const snap = await getDoc(eligRef);
      if (!snap.exists()) {
        const res = { eligible: false, hasVoted: false };
        dbCache.set(cacheKey, res, 900000); // 15 mins TTL
        return res;
      }
      const data = snap.data() as Eligibility;
      const res = {
        eligible: data.eligible === true,
        hasVoted: data.hasVoted === true,
        eligibilityDoc: data
      };
      dbCache.set(cacheKey, res, 900000); // 15 mins TTL
      return res;
    } catch (error) {
      console.error('Error checking voter eligibility:', error);
      return { eligible: false, hasVoted: false };
    }
  });
}

// ==========================================
// SECURE VOTING TRANSACTION ENGINE
// ==========================================
export interface VoteSubmissionResult {
  success: boolean;
  code: string;
  message: string;
  receiptHash?: string;
  timestamp?: string;
}

export async function submitVote(
  exerciseId: string,
  nomineeId: string,
  voter: { personId: string; voterName: string; voterCode?: string; voterEmail?: string }
): Promise<VoteSubmissionResult> {
  try {
    const exerciseRef = doc(db, 'votingExercises', exerciseId);
    const nomineeRef = doc(db, 'votingExercises', exerciseId, 'nominees', nomineeId);
    const eligRef = doc(db, 'votingExercises', exerciseId, 'eligibility', voter.personId);
    const voteRef = doc(collection(db, 'votingExercises', exerciseId, 'votes'));

    const result = await runTransaction(db, async (transaction) => {
      // 1. Fetch exercise doc
      const exerciseSnap = await transaction.get(exerciseRef);
      if (!exerciseSnap.exists()) {
        return { success: false, code: 'VOTING_NOT_FOUND', message: 'Voting exercise not found.' };
      }
      const exercise = exerciseSnap.data() as VotingExercise;

      // 2. Validate Exercise Status
      const now = new Date();
      const nowISO = now.toISOString();

      if (exercise.status === 'archived' || exercise.status === 'closed') {
        return { success: false, code: 'VOTING_CLOSED', message: 'This voting exercise is closed.' };
      }
      if (exercise.status === 'draft') {
        return { success: false, code: 'VOTING_NOT_STARTED', message: 'This voting exercise has not launched yet.' };
      }
      if (exercise.startTime && exercise.startTime > nowISO) {
        return { success: false, code: 'VOTING_NOT_STARTED', message: `Voting opens on ${new Date(exercise.startTime).toLocaleString()}.` };
      }
      if (exercise.endTime && exercise.endTime <= nowISO) {
        return { success: false, code: 'VOTING_EXPIRED', message: 'Voting deadline has passed.' };
      }

      // 3. Validate Nominee exists and is active
      const nomineeSnap = await transaction.get(nomineeRef);
      if (!nomineeSnap.exists()) {
        return { success: false, code: 'NOMINEE_NOT_FOUND', message: 'Selected nominee was not found.' };
      }
      const nominee = nomineeSnap.data() as Nominee;
      if (nominee.active === false) {
        return { success: false, code: 'INVALID_NOMINEE', message: 'The selected nominee is currently inactive.' };
      }

      // 4. Validate Self-Voting rule
      if (!exercise.allowSelfVote && nominee.personId && nominee.personId === voter.personId) {
        return { success: false, code: 'SELF_VOTE_NOT_ALLOWED', message: 'Self-voting is not permitted for this exercise.' };
      }

      // 5. Check Eligibility and Double Voting
      const eligSnap = await transaction.get(eligRef);
      if (!eligSnap.exists() || eligSnap.data()?.eligible !== true) {
        return { success: false, code: 'NOT_ELIGIBLE', message: 'You are not on the verified voter registry for this exercise.' };
      }
      const eligData = eligSnap.data() as Eligibility;
      if (eligData.hasVoted) {
        return { success: false, code: 'ALREADY_VOTED', message: 'You have already submitted a vote for this exercise.' };
      }

      // 6. Generate anonymous receipt hash
      const receiptSeed = `${exerciseId}-${voter.personId}-${Date.now()}`;
      let hash = 0;
      for (let i = 0; i < receiptSeed.length; i++) {
        hash = ((hash << 5) - hash) + receiptSeed.charCodeAt(i);
        hash |= 0;
      }
      const receiptHash = `REC-${Math.abs(hash).toString(16).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 7. Write Vote doc
      const voteData: Vote = {
        id: voteRef.id,
        votingExerciseId: exerciseId,
        nomineeId: nomineeId,
        voterId: voter.personId,
        timestamp: nowISO,
        receiptHash
      };
      transaction.set(voteRef, voteData);

      // 8. Update Voter Eligibility record to hasVoted: true
      transaction.update(eligRef, {
        hasVoted: true,
        votedAt: nowISO,
        updatedAt: nowISO
      });

      // 9. Increment exercise total votes
      transaction.update(exerciseRef, {
        totalVotes: increment(1),
        updatedAt: nowISO
      });

      return {
        success: true,
        code: 'VOTE_SUCCESS',
        message: 'Your vote was successfully recorded. Thank you for participating!',
        receiptHash,
        timestamp: nowISO
      };
    });

    if (result.success) {
      dbCache.invalidate(`results_${exerciseId}`);
      dbCache.invalidate(`eligibility_${exerciseId}`);
      dbCache.invalidate(`elig_check_${exerciseId}_${voter.personId}`);
      dbCache.invalidate(`exercise_doc_${exerciseId}`);
      dbCache.invalidate('exercises');
      await logAuditEvent(
        { id: voter.personId, name: voter.voterName, email: voter.voterEmail, role: 'voter' },
        'Submitted Vote',
        'vote',
        exerciseId,
        `Voter cast vote for nominee in exercise ${exerciseId} with receipt ${result.receiptHash}`
      );
    }

    return result;
  } catch (error: any) {
    console.error('Vote submission error:', error);
    return {
      success: false,
      code: 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred while processing your vote. Please try again.'
    };
  }
}

// ==========================================
// RESULTS ENGINE
// ==========================================
export async function getVotingResults(exerciseId: string, forceRefresh = false): Promise<VotingResult | null> {
  const cacheKey = `results_${exerciseId}`;
  if (!forceRefresh) {
    const cached = dbCache.get<VotingResult>(cacheKey);
    if (cached) return cached;
  }

  return dbCache.dedupe(cacheKey, async () => {
    try {
      const exercise = await getVotingExerciseById(exerciseId);
      if (!exercise) return null;

      // Quota Optimization: If exercise has 0 recorded votes, avoid querying the votes subcollection
      if (!exercise.totalVotes || exercise.totalVotes === 0) {
        const [nominees, eligList] = await Promise.all([
          getNominees(exerciseId),
          getEligibleVotersForExercise(exerciseId)
        ]);

        const zeroResult: VotingResult = {
          votingExerciseId: exerciseId,
          totalEligible: eligList.length,
          totalVotes: 0,
          participationRate: 0,
          nomineeResults: nominees.map(n => ({
            nomineeId: n.id,
            displayName: n.displayName,
            photoUrl: n.photoUrl,
            roleOrTitle: n.roleOrTitle,
            department: n.department,
            voteCount: 0,
            percentage: 0
          })),
          isTie: false,
          winners: [],
          resultsPublished: exercise.resultsPublished === true,
          generatedAt: new Date().toISOString()
        };

        const ttl = (exercise.status === 'closed' || exercise.resultsPublished) ? 604800000 : 300000;
        dbCache.set(cacheKey, zeroResult, ttl);
        return zeroResult;
      }

      const [nominees, eligList, votesSnap] = await Promise.all([
        getNominees(exerciseId),
        getEligibleVotersForExercise(exerciseId),
        getDocs(collection(db, 'votingExercises', exerciseId, 'votes'))
      ]);

      const totalEligible = eligList.length;
      const totalVotes = votesSnap.size;

      // Count votes per nominee
      const voteCounts: Record<string, number> = {};
      nominees.forEach(n => {
        voteCounts[n.id] = 0;
      });

      votesSnap.docs.forEach(doc => {
        const v = doc.data() as Vote;
        if (voteCounts[v.nomineeId] !== undefined) {
          voteCounts[v.nomineeId]++;
        } else {
          voteCounts[v.nomineeId] = 1;
        }
      });

      // Pre-fetch people if any nominee has personId but lacks photoUrl
      let peoplePhotoMap: Map<string, string> | null = null;
      const needsPhotoLookup = nominees.some(n => !n.photoUrl && n.personId);
      if (needsPhotoLookup) {
        try {
          const allPeople = await getPeople(false);
          peoplePhotoMap = new Map(
            allPeople
              .filter(p => p.photoUrl || p.avatarUrl)
              .map(p => [p.id, (p.photoUrl || p.avatarUrl)!])
          );
        } catch {
          // ignore
        }
      }

      const nomineeResults: NomineeResult[] = nominees.map(n => {
        const count = voteCounts[n.id] || 0;
        const pct = totalVotes > 0 ? Number(((count / totalVotes) * 100).toFixed(1)) : 0;
        let resolvedPhoto = n.photoUrl;
        if (!resolvedPhoto && n.personId && peoplePhotoMap) {
          resolvedPhoto = peoplePhotoMap.get(n.personId);
        }
        return {
          nomineeId: n.id,
          displayName: n.displayName,
          photoUrl: resolvedPhoto || undefined,
          roleOrTitle: n.roleOrTitle,
          department: n.department,
          voteCount: count,
          percentage: pct
        };
      });

      // Sort by vote count descending
      nomineeResults.sort((a, b) => b.voteCount - a.voteCount);

      // Identify winners & ties
      let winners: NomineeResult[] = [];
      let isTie = false;

      if (totalVotes > 0 && nomineeResults.length > 0) {
        const topVotes = nomineeResults[0].voteCount;
        if (topVotes > 0) {
          winners = nomineeResults.filter(n => n.voteCount === topVotes);
          isTie = winners.length > 1;
        }
      }

      const participationRate = totalEligible > 0 ? Number(((totalVotes / totalEligible) * 100).toFixed(1)) : 0;

      const result: VotingResult = {
        votingExerciseId: exerciseId,
        totalEligible,
        totalVotes,
        participationRate,
        nomineeResults,
        isTie,
        winners,
        resultsPublished: exercise.resultsPublished === true,
        generatedAt: new Date().toISOString()
      };

      // If exercise is closed or results published, cache for 7 days in persistent storage; otherwise 5 minutes
      const ttl = (exercise.status === 'closed' || exercise.resultsPublished) ? 604800000 : 300000;
      dbCache.set(cacheKey, result, ttl);
      return result;
    } catch (error) {
      console.error('Error computing voting results:', error);
      return null;
    }
  });
}

export async function getAllPreviousWinners(forceRefresh = false): Promise<WinnerRecord[]> {
  const cacheKey = 'previous_winners_master';
  if (!forceRefresh) {
    const cached = dbCache.get<WinnerRecord[]>(cacheKey);
    if (cached) return cached;
  }

  return dbCache.dedupe(cacheKey, async () => {
    try {
      const exercises = await getVotingExercises({ includeArchived: true });
      const winnerRecords: WinnerRecord[] = [];

      // Only include exercises whose results have been certified and officially published:
      // 1. If resultsPublished === true (manually or officially published by admin)
      // 2. OR if resultsVisibilityMode === 'publish_after_close' AND the exercise has actually concluded (status === 'closed' or endTime <= now) with votes.
      // Ongoing exercises (status === 'open') or exercises set to 'manual_publish' / 'admin_only' must NEVER show in the Hall of Fame until resultsPublished is explicitly set to true.
      const eligibleExercises = exercises.filter((e) => {
        // 1. If officially published by admin, it is eligible
        if (e.resultsPublished) {
          return true;
        }

        // 2. If exercise is still open / ongoing, NEVER show progressive results in the Hall of Fame
        const isPastEndTime = e.endTime ? new Date(e.endTime).getTime() <= Date.now() : false;
        const isConcluded = e.status === 'closed' || (isPastEndTime && e.status !== 'draft');
        if (!isConcluded) {
          return false;
        }

        // 3. If closed, only show if explicitly configured for automatic publishing after close
        // Exercises with 'manual_publish' or 'admin_only' MUST remain hidden until an admin publishes them
        if (e.resultsVisibilityMode === 'publish_after_close' && e.totalVotes && e.totalVotes > 0) {
          return true;
        }

        return false;
      });

      for (const ex of eligibleExercises) {
        // Skip fetching votes subcollection for exercises with 0 votes
        if (!ex.totalVotes || ex.totalVotes <= 0) {
          continue;
        }
        try {
          const results = await getVotingResults(ex.id);
          if (results && results.winners && results.winners.length > 0 && results.totalVotes > 0) {
            const topWinner = results.winners[0];
            winnerRecords.push({
              exerciseId: ex.id,
              exerciseTitle: ex.title,
              exerciseSlug: ex.slug,
              categoryName: ex.categoryName,
              scopeType: ex.scopeType,
              organisationId: ex.organisationId || 'org-general',
              organisationName: ex.organisationName || 'TRH Workforce',
              departmentId: ex.departmentId,
              departmentName: ex.departmentName,
              unitId: ex.unitId,
              unitName: ex.unitName,
              endTime: ex.endTime,
              totalVotes: results.totalVotes,
              totalEligible: results.totalEligible,
              participationRate: results.participationRate,
              isTie: results.isTie,
              winner: topWinner,
              allWinners: results.winners,
              allNomineesCount: results.nomineeResults.length
            });
          }
        } catch (err) {
          console.warn(`Could not compute winner for exercise ${ex.id}:`, err);
        }
      }

      // Also fetch legacy / historical Hall of Fame winners entered from the previous web app
      try {
        const legacyWinners = await getLegacyWinners(forceRefresh);
        for (const lw of legacyWinners) {
          const estDate = getEstimatedDateFromMonthYear(lw.month, lw.year);

          const deptNames: string[] = [];
          if (lw.departmentName) deptNames.push(lw.departmentName);
          if (lw.secondaryDepartmentName && lw.secondaryDepartmentName !== lw.departmentName) {
            deptNames.push(lw.secondaryDepartmentName);
          }

          const deptIds: string[] = [];
          if (lw.departmentId) deptIds.push(lw.departmentId);
          if (lw.secondaryDepartmentId && lw.secondaryDepartmentId !== lw.departmentId) {
            deptIds.push(lw.secondaryDepartmentId);
          }

          const isJoint = Boolean(
            lw.isJointWinner ||
            (lw.secondaryDepartmentId && lw.secondaryDepartmentId.trim()) ||
            (lw.jointWinnerName && lw.jointWinnerName.trim())
          );

          const winnersList: Array<{
            nomineeId: string;
            displayName: string;
            photoUrl?: string;
            roleOrTitle?: string;
            voteCount: number;
            percentage: number;
          }> = [
            {
              nomineeId: `legacy-${lw.id}-1`,
              displayName: lw.name,
              photoUrl: lw.photoUrl,
              roleOrTitle: lw.roleOrTitle || (lw.departmentName ? `${lw.departmentName} Contributor` : undefined),
              voteCount: lw.votesCount || 0,
              percentage: isJoint ? 50 : 100
            }
          ];

          if (lw.jointWinnerName && lw.jointWinnerName.trim()) {
            winnersList.push({
              nomineeId: `legacy-${lw.id}-2`,
              displayName: lw.jointWinnerName.trim(),
              photoUrl: lw.jointWinnerPhotoUrl,
              roleOrTitle: lw.jointWinnerRole || (lw.secondaryDepartmentName ? `${lw.secondaryDepartmentName} Contributor` : undefined),
              voteCount: lw.votesCount || 0,
              percentage: 50
            });
          }

          let inferredScope: VotingScopeType = lw.scopeType || 'workforce';
          if (!lw.scopeType) {
            const as = (lw.awardScope || '').toLowerCase();
            const ac = (lw.awardCategory || '').toLowerCase();
            if (as.includes('church') || ac === 'innovative' || ac.includes('church')) {
              inferredScope = 'church';
            } else if (as.includes('workforce') || ac === 'workforce_wide') {
              inferredScope = 'workforce';
            } else if (as.includes('organis') || as.includes('organiz') || ac.includes('organis')) {
              inferredScope = 'organisation';
            } else if (lw.unitName || lw.unitId || as.includes('unit') || ac === 'unit') {
              inferredScope = 'unit';
            } else if (lw.departmentName || lw.departmentId || as.includes('department') || ac === 'departmental') {
              inferredScope = 'department';
            }
          }

          winnerRecords.push({
            exerciseId: `legacy-${lw.id}`,
            exerciseTitle: lw.awardTitle || `${lw.month} ${lw.year} Honoree`,
            exerciseSlug: `legacy-${lw.id}`,
            categoryName: lw.awardTitle || 'Worker of the Month',
            scopeType: lw.scopeType || inferredScope,
            awardCategory: lw.awardCategory,
            awardScope: lw.awardScope,
            organisationId: lw.organisationId || 'org-general',
            organisationName: lw.organisationName || 'TRH Workforce',
            departmentId: lw.departmentId,
            departmentName: lw.departmentName,
            secondaryDepartmentId: lw.secondaryDepartmentId,
            secondaryDepartmentName: lw.secondaryDepartmentName,
            departmentIds: deptIds.length > 0 ? deptIds : undefined,
            departmentNames: deptNames.length > 0 ? deptNames : undefined,
            unitId: lw.unitId,
            unitName: lw.unitName,
            isJointWinner: isJoint,
            jointWinnerName: lw.jointWinnerName,
            jointWinnerPhotoUrl: lw.jointWinnerPhotoUrl,
            jointWinnerRole: lw.jointWinnerRole,
            endTime: estDate,
            totalVotes: lw.votesCount || 0,
            totalEligible: 0,
            participationRate: 0,
            isTie: isJoint,
            winner: winnersList[0],
            allWinners: winnersList,
            allNomineesCount: winnersList.length,
            isLegacy: true,
            legacyId: lw.id,
            month: lw.month,
            year: lw.year,
            awardTitle: lw.awardTitle,
            citation: lw.citation
          });
        }
      } catch (legErr) {
        console.warn('Could not fetch legacy Hall of Fame winners:', legErr);
      }

      // Sort winners with latest endTime first
      winnerRecords.sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());
      dbCache.set(cacheKey, winnerRecords, 604800000); // 7 days cache in persistent storage
      return winnerRecords;
    } catch (error) {
      console.error('Error getting all previous winners:', error);
      return [];
    }
  });
}

// Helper: estimate an ISO timestamp from month and year for chronologic sorting
export function getEstimatedDateFromMonthYear(month: string, year: number): string {
  const monthMap: Record<string, number> = {
    january: 0, jan: 0, '1': 0, '01': 0,
    february: 1, feb: 1, '2': 1, '02': 1,
    march: 2, mar: 2, '3': 2, '03': 2,
    april: 3, apr: 3, '4': 3, '04': 3,
    may: 4, '5': 4, '05': 4,
    june: 5, jun: 5, '6': 5, '06': 5,
    july: 6, jul: 6, '7': 6, '07': 6,
    august: 7, aug: 7, '8': 7, '08': 7,
    september: 8, sep: 8, sept: 8, '9': 8, '09': 8,
    october: 9, oct: 9, '10': 9,
    november: 10, nov: 10, '11': 10,
    december: 11, dec: 11, '12': 11
  };
  const m = monthMap[(month || '').toLowerCase().trim()] ?? 0;
  const safeYear = year && year > 2000 ? year : new Date().getFullYear();
  const d = new Date(safeYear, m, 28, 12, 0, 0);
  return d.toISOString();
}

// ==========================================
// LEGACY HALL OF FAME MANAGEMENT (PREVIOUS WEB APP)
// ==========================================
export async function getLegacyWinners(forceRefresh = false): Promise<LegacyWinnerRecord[]> {
  const cacheKey = 'legacy_winners_master';
  if (!forceRefresh) {
    const cached = dbCache.get<LegacyWinnerRecord[]>(cacheKey);
    if (cached && cached.length > 0) return cached;
  }

  return dbCache.dedupe(cacheKey, async () => {
    try {
      const collRef = collection(db, 'legacyHallOfFame');
      const snap = await getDocs(collRef);
      const records: LegacyWinnerRecord[] = [];
      snap.docs.forEach((d) => {
        const data = d.data();
        records.push({
          id: d.id,
          name: data.name || '',
          photoUrl: data.photoUrl || '',
          organisationId: data.organisationId || '',
          organisationName: data.organisationName || 'TRH Workforce',
          departmentId: data.departmentId || '',
          departmentName: data.departmentName || '',
          secondaryDepartmentId: data.secondaryDepartmentId || '',
          secondaryDepartmentName: data.secondaryDepartmentName || '',
          departmentIds: data.departmentIds || (data.secondaryDepartmentId ? [data.departmentId, data.secondaryDepartmentId].filter(Boolean) : (data.departmentId ? [data.departmentId] : [])),
          departmentNames: data.departmentNames || (data.secondaryDepartmentName ? [data.departmentName, data.secondaryDepartmentName].filter(Boolean) : (data.departmentName ? [data.departmentName] : [])),
          isJointWinner: Boolean(data.isJointWinner || data.secondaryDepartmentId || data.jointWinnerName),
          jointWinnerName: data.jointWinnerName || '',
          jointWinnerPhotoUrl: data.jointWinnerPhotoUrl || '',
          jointWinnerRole: data.jointWinnerRole || '',
          unitId: data.unitId || '',
          unitName: data.unitName || '',
          month: data.month || 'January',
          year: Number(data.year) || new Date().getFullYear(),
          awardTitle: data.awardTitle || 'Worker of the Month',
          awardCategory: data.awardCategory || (data.unitName ? 'unit' : data.departmentName ? 'departmental' : 'workforce_wide'),
          awardScope: data.awardScope || (data.unitName ? 'Unit' : data.departmentName ? 'Departmental' : 'Workforce-wide'),
          scopeType: data.scopeType || undefined,
          roleOrTitle: data.roleOrTitle || '',
          citation: data.citation || '',
          votesCount: data.votesCount ? Number(data.votesCount) : undefined,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          createdBy: data.createdBy || ''
        });
      });

      // Sort by year desc, then month desc
      records.sort((a, b) => {
        const dateA = new Date(getEstimatedDateFromMonthYear(a.month, a.year)).getTime();
        const dateB = new Date(getEstimatedDateFromMonthYear(b.month, b.year)).getTime();
        return dateB - dateA;
      });

      dbCache.set(cacheKey, records, 604800000); // 7 days TTL in persistent storage
      return records;
    } catch (error) {
      console.warn('Error fetching legacy Hall of Fame winners (serving cached/defaults):', error);
      const stale = dbCache.getStale<LegacyWinnerRecord[]>(cacheKey);
      if (stale && stale.length > 0) return stale;
      return DEFAULT_LEGACY_WINNERS;
    }
  });
}

export async function createLegacyWinner(
  data: Omit<LegacyWinnerRecord, 'id' | 'createdAt' | 'updatedAt'>,
  actor: { id: string; name: string; email?: string }
): Promise<string> {
  const collRef = collection(db, 'legacyHallOfFame');
  const docRef = doc(collRef);
  const now = new Date().toISOString();

  const record: LegacyWinnerRecord = {
    ...data,
    id: docRef.id,
    createdAt: now,
    updatedAt: now,
    createdBy: actor.name || actor.id
  };

  await setDoc(docRef, cleanFirestoreData(record));

  // Purge all legacy caches immediately so updates show up in all components and tabs
  dbCache.invalidate('legacy_winners_master');
  dbCache.invalidate('previous_winners_master');
  dbCache.invalidate(`legacy_winner_${docRef.id}`);
  dbCache.invalidate('legacy_');

  await logAuditEvent(
    actor,
    'Added Legacy Hall of Fame Winner',
    'system',
    docRef.id,
    `Added past winner ${data.name} (${data.month} ${data.year}) to Hall of Fame Archive`,
    { name: data.name, month: data.month, year: data.year, organisation: data.organisationName }
  );

  return docRef.id;
}

export async function updateLegacyWinner(
  id: string,
  data: Partial<LegacyWinnerRecord>,
  actor: { id: string; name: string; email?: string }
): Promise<void> {
  const docRef = doc(db, 'legacyHallOfFame', id);
  const now = new Date().toISOString();

  // Use setDoc with merge: true to cleanly apply all updates
  await setDoc(docRef, cleanFirestoreData({
    ...data,
    updatedAt: now
  }), { merge: true });

  // Purge all legacy caches immediately
  dbCache.invalidate('legacy_winners_master');
  dbCache.invalidate('previous_winners_master');
  dbCache.invalidate(`legacy_winner_${id}`);
  dbCache.invalidate('legacy_');

  await logAuditEvent(
    actor,
    'Updated Legacy Hall of Fame Winner',
    'system',
    id,
    `Updated historical winner details for ${data.name || id}`,
    data
  );
}

export async function deleteLegacyWinner(
  id: string,
  actor: { id: string; name: string; email?: string; role?: string }
): Promise<void> {
  assertSuperAdmin(actor, 'Hall of Fame winner records');
  const docRef = doc(db, 'legacyHallOfFame', id);
  await deleteDoc(docRef);

  // Purge all legacy caches immediately
  dbCache.invalidate('legacy_winners_master');
  dbCache.invalidate('previous_winners_master');
  dbCache.invalidate(`legacy_winner_${id}`);
  dbCache.invalidate('legacy_');

  await logAuditEvent(
    actor,
    'Deleted Legacy Hall of Fame Winner',
    'system',
    id,
    `Deleted past winner record from Hall of Fame Archive`
  );
}

export async function openVotingExercise(id: string, actor: { id: string; name: string; email?: string }): Promise<void> {
  return setVotingExerciseStatus(id, 'open', actor);
}

export async function closeVotingExercise(id: string, actor: { id: string; name: string; email?: string }): Promise<void> {
  return setVotingExerciseStatus(id, 'closed', actor);
}

export async function archiveVotingExercise(id: string, actor: { id: string; name: string; email?: string }): Promise<void> {
  return setVotingExerciseStatus(id, 'archived', actor);
}

export async function publishResults(id: string, actor: { id: string; name: string; email?: string }): Promise<void> {
  return toggleResultsPublished(id, true, actor);
}

export async function unpublishResults(id: string, actor: { id: string; name: string; email?: string }): Promise<void> {
  return toggleResultsPublished(id, false, actor);
}

// Aliases for Criteria & Nominees
export const createCriterion = addCriterion;
export const createNominee = addNominee;

export async function activateNominee(
  exerciseId: string,
  nomineeId: string,
  actor: { id: string; name: string; email?: string }
): Promise<void> {
  return updateNominee(exerciseId, nomineeId, { active: true }, actor);
}

export async function deactivateNominee(
  exerciseId: string,
  nomineeId: string,
  actor: { id: string; name: string; email?: string }
): Promise<void> {
  return updateNominee(exerciseId, nomineeId, { active: false }, actor);
}

export const assignVoterEligibility = assignEligibilityBatch;
export const removeVoterEligibility = removeEligibility;

export async function getVotingWinner(exerciseId: string): Promise<{ isTie: boolean; winners: NomineeResult[] }> {
  const res = await getVotingResults(exerciseId);
  if (!res) return { isTie: false, winners: [] };
  return { isTie: res.isTie, winners: res.winners };
}

// ==========================================
// VOTER-FACING FUNCTIONS (Item 40)
// ==========================================
export async function getAvailableVotingExercises(): Promise<VotingExercise[]> {
  const all = await getVotingExercises({ includeArchived: false });
  return all.filter(e => e.status === 'open' || e.status === 'scheduled');
}

export async function getVotingExercise(id: string): Promise<VotingExercise | null> {
  return getVotingExerciseById(id);
}

export async function getEligibleVotingExercises(personId: string): Promise<Array<VotingExercise & { hasVoted: boolean; isEligible: boolean }>> {
  const allExercises = await getVotingExercises({ includeArchived: false });
  const results: Array<VotingExercise & { hasVoted: boolean; isEligible: boolean }> = [];

  for (const ex of allExercises) {
    const status = await checkVoterEligibility(ex.id, personId);
    if (status.eligible) {
      results.push({
        ...ex,
        hasVoted: status.hasVoted,
        isEligible: true
      });
    }
  }

  return results;
}

export async function getPublishedResults(exerciseId: string): Promise<VotingResult | null> {
  const exercise = await getVotingExerciseById(exerciseId);
  if (!exercise || !exercise.resultsPublished) {
    return null;
  }
  return getVotingResults(exerciseId);
}

// ==========================================
// AUDIT LOGS QUERY & MANAGEMENT
// ==========================================
export async function getAuditLogs(limitCount = 100, forceRefresh = false): Promise<AuditLog[]> {
  const cacheKey = `auditLogs_${limitCount}`;
  if (!forceRefresh) {
    const cached = dbCache.get<AuditLog[]>(cacheKey);
    if (cached) return cached;
  }

  try {
    const logsRef = collection(db, 'auditLogs');
    // Try ordered and limited query to avoid reading entire collection
    let snap;
    try {
      snap = await getDocs(query(logsRef, orderBy('createdAt', 'desc'), limit(limitCount)));
    } catch {
      // Fallback if index missing
      snap = await getDocs(query(logsRef, limit(limitCount * 2)));
    }
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const res = logs.slice(0, limitCount);
    dbCache.set(cacheKey, res, 600000); // 10 mins TTL
    return res;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
}

/**
 * Wipes out all audit trails not carried out by the super admin.
 */
export async function wipeNonSuperAdminAuditTrails(
  actor: { id: string; name: string; email?: string; role?: string }
): Promise<{ purgedLogs: number }> {
  try {
    const logsRef = collection(db, 'auditLogs');
    const snap = await getDocs(logsRef);
    let purgedLogs = 0;

    for (const d of snap.docs) {
      const data = d.data() as AuditLog;
      // Keep only logs explicitly made by super_admin
      const isSuperAdminLog = data.actorRole === 'super_admin' || 
                             (data.actorName || '').toLowerCase().includes('super admin') ||
                             (data.actorEmail || '').toLowerCase().includes('superadmin');
      if (!isSuperAdminLog) {
        await deleteDoc(doc(db, 'auditLogs', d.id));
        purgedLogs++;
      }
    }

    await logAuditEvent(
      actor,
      'Wiped Non-Super Admin Audit Trails',
      'system',
      'bulk-purge',
      `Super Admin wiped ${purgedLogs} audit log entries not carried out by super admin.`
    );

    return { purgedLogs };
  } catch (error) {
    console.error('Error wiping audit logs:', error);
    throw error;
  }
}

/**
 * Purges mock organisations created during initial bootstrapping,
 * along with wiping out audit trails not carried out by the super admin.
 */
export async function purgeMockOrganisationsAndAuditTrails(
  actor: { id: string; name: string; email?: string; role?: string }
): Promise<{ deletedOrgs: number; purgedLogs: number }> {
  try {
    // 1. Delete mock organisations
    const orgsRef = collection(db, 'organisations');
    const orgsSnap = await getDocs(orgsRef);
    let deletedOrgs = 0;

    const mockSlugs = [
      'sanctuary-organisation',
      'sanctuary-altar-care-organisation',
      'music-worship-organisation',
      'media-tech-organisation',
      'protocol-hospitality-organisation'
    ];

    const deletedOrgIds: string[] = [];

    for (const d of orgsSnap.docs) {
      const orgData = d.data() as Organisation;
      const isMockOrg = mockSlugs.includes(orgData.slug) ||
                        orgData.createdBy === 'system_seeder' ||
                        orgData.name.includes('Sanctuary') ||
                        orgData.name.includes('Music & Worship') ||
                        orgData.name.includes('Media & Tech') ||
                        orgData.name.includes('Protocol & Hospitality');
      if (isMockOrg) {
        deletedOrgIds.push(d.id);
        await deleteDoc(doc(db, 'organisations', d.id));
        deletedOrgs++;
      }
    }

    // 2. Delete mock departments linked to mock orgs
    if (deletedOrgIds.length > 0) {
      const deptsRef = collection(db, 'departments');
      const deptsSnap = await getDocs(deptsRef);
      for (const d of deptsSnap.docs) {
        const deptData = d.data() as Department;
        if (deletedOrgIds.includes(deptData.organisationId) || deptData.createdBy === 'system_seeder') {
          await deleteDoc(doc(db, 'departments', d.id));
        }
      }

      // Delete mock people linked to mock orgs
      const peopleRef = collection(db, 'people');
      const peopleSnap = await getDocs(peopleRef);
      for (const d of peopleSnap.docs) {
        const personData = d.data() as Person;
        if (personData.organisationId && deletedOrgIds.includes(personData.organisationId)) {
          await deleteDoc(doc(db, 'people', d.id));
        }
      }

      // Delete mock exercises linked to mock orgs
      const exercisesRef = collection(db, 'votingExercises');
      const exercisesSnap = await getDocs(exercisesRef);
      for (const d of exercisesSnap.docs) {
        const exData = d.data() as VotingExercise;
        if (deletedOrgIds.includes(exData.organisationId) || exData.createdBy === 'system_seeder') {
          await deleteDoc(doc(db, 'votingExercises', d.id));
        }
      }
    }

    // 3. Wipe non-super admin audit trails
    const auditRes = await wipeNonSuperAdminAuditTrails(actor);

    await logAuditEvent(
      actor,
      'Purged Mock Organisations and Non-Super Admin Audit Trails',
      'system',
      'system-cleanup',
      `Super Admin successfully deleted ${deletedOrgs} mock organisations and wiped ${auditRes.purgedLogs} audit logs.`
    );

    return { deletedOrgs, purgedLogs: auditRes.purgedLogs };
  } catch (error) {
    console.error('Error purging mock organisations and audit trails:', error);
    throw error;
  }
}

// ==========================================
// SAMPLE DATA SEEDER (GENERIC CHURCH DEMO)
// ==========================================
export async function seedSampleChurchData(providedActor?: { id: string; name: string; email?: string }): Promise<void> {
  const actor = providedActor || {
    id: 'system_seeder',
    name: 'System Seeder',
    email: 'admin@church.org'
  };

  const now = new Date();
  const nowISO = now.toISOString();
  const tomorrowISO = new Date(now.getTime() + 86400000 * 5).toISOString();
  const pastWeekISO = new Date(now.getTime() - 86400000 * 7).toISOString();
  const yesterdayISO = new Date(now.getTime() - 86400000).toISOString();

  // 1. Create Organisations
  const orgsData = [
    {
      name: 'Sanctuary Organisation',
      slug: 'sanctuary-organisation',
      description: 'Responsible for maintaining church premises, stage order, and reverence in the house of God.',
      status: 'active' as StatusType,
      createdBy: actor.id,
      logoUrl: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=150&auto=format&fit=crop&q=80'
    },
    {
      name: 'Music & Worship Organisation',
      slug: 'music-worship-organisation',
      description: 'Leading the congregation in worship, choir orchestration, and musical excellence.',
      status: 'active' as StatusType,
      createdBy: actor.id,
      logoUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80'
    },
    {
      name: 'Media & Tech Organisation',
      slug: 'media-tech-organisation',
      description: 'Powering live streams, broadcast graphics, camera switching, acoustics, and cloud operations.',
      status: 'active' as StatusType,
      createdBy: actor.id,
      logoUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150&auto=format&fit=crop&q=80'
    },
    {
      name: 'Protocol & Hospitality Organisation',
      slug: 'protocol-hospitality-organisation',
      description: 'Ensuring orderly seating, VIP welcoming, first-time guest reception, and seamless logistics.',
      status: 'active' as StatusType,
      createdBy: actor.id,
      logoUrl: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=150&auto=format&fit=crop&q=80'
    }
  ];

  const createdOrgs: Organisation[] = [];
  for (const org of orgsData) {
    const o = await createOrganisation(org, actor);
    createdOrgs.push(o);
  }

  // 2. Create Departments for each Org
  const departmentsData: Array<{ orgIdx: number; name: string; description: string }> = [
    { orgIdx: 0, name: 'Sanctuary Maintenance Team', description: 'Auditorium preparation, cleanliness, and altar care.' },
    { orgIdx: 0, name: 'Ushering & Seat Stewards', description: 'Crowd coordination and communion distribution.' },
    { orgIdx: 1, name: 'Choir & Vocalists', description: 'Harmonies, praise leads, and choral arrangements.' },
    { orgIdx: 1, name: 'Instrumentalists & Band', description: 'Keyboards, drums, bass, strings, and brass.' },
    { orgIdx: 2, name: 'Live Broadcast & Video Team', description: 'Multi-camera switching and stream engineering.' },
    { orgIdx: 2, name: 'Sound & Acoustic Engineering', description: 'FOH mixing, stage monitors, and multi-track recording.' },
    { orgIdx: 3, name: 'VIP Guest Protocol', description: 'Ministerial assistance and guest speaker hospitality.' },
    { orgIdx: 3, name: 'First Timers Welcome Desk', description: 'Follow-up coordination and new member guidance.' }
  ];

  const createdDepts: Department[] = [];
  for (const dept of departmentsData) {
    const org = createdOrgs[dept.orgIdx];
    const d = await createDepartment({
      organisationId: org.id,
      organisationName: org.name,
      name: dept.name,
      slug: dept.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: dept.description,
      status: 'active',
      createdBy: actor.id
    }, actor);
    createdDepts.push(d);
  }

  // 2.5. Create Units for each Department (Units are under Departments)
  const unitsData: Array<{ deptIdx: number; name: string; code: string; description: string; headOfUnit?: string }> = [
    { deptIdx: 0, name: 'Altar Care Unit', code: 'ACU', description: 'Meticulous preparation of the pulpit, communion table, and altar flowers.' },
    { deptIdx: 0, name: 'Main Auditorium Maintenance', code: 'MAM', description: 'Floor care, seating arrangement, and sanctuary ambience.' },
    { deptIdx: 1, name: 'Gallery & Balcony Stewards', code: 'GBS', description: 'Ushering and seating in the upper sanctuary gallery.' },
    { deptIdx: 1, name: 'Ground Floor Ushers', code: 'GFU', description: 'Main hall coordination, offering collection, and crowd management.' },
    { deptIdx: 2, name: 'Soprano & Alto Vocal Harmony', code: 'SAV', description: 'High registers, melody leads, and treble choir sections.' },
    { deptIdx: 2, name: 'Tenor & Bass Section', code: 'TBS', description: 'Vocal foundation, harmonization, and baritone depth.' },
    { deptIdx: 3, name: 'Keyboards & Synthesizer Unit', code: 'KSU', description: 'Lead piano, organ, pads, and auxiliary synthesizers.' },
    { deptIdx: 3, name: 'Drums & Percussion Unit', code: 'DPU', description: 'Acoustic kit, electronic pads, and aux percussion timing.' },
    { deptIdx: 4, name: 'Camera Operations Unit', code: 'COU', description: 'Main broadcast cameras, gimbal tracking, and crane camera.' },
    { deptIdx: 4, name: 'Switcher & Stream Engineering', code: 'SSE', description: 'Video switcher, graphics overlays, and cloud streaming.' },
    { deptIdx: 6, name: 'VIP Guest & Speaker Protocol', code: 'VGP', description: 'Ministerial coordination and international guest reception.' }
  ];

  const createdUnits: Unit[] = [];
  for (const unit of unitsData) {
    const dept = createdDepts[unit.deptIdx];
    const u = await createUnit({
      departmentId: dept.id,
      departmentName: dept.name,
      organisationId: dept.organisationId,
      organisationName: dept.organisationName,
      name: unit.name,
      slug: unit.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      code: unit.code,
      description: unit.description,
      status: 'active',
      createdBy: actor.id
    }, actor);
    createdUnits.push(u);
  }

  // 3. Create People / Voters
  const samplePeople = [
    { fullName: 'Sister Mary Johnson', email: 'mary.j@trhchurch.org', phone: '+1-555-0101', roleTitle: 'Senior Steward', orgIdx: 0, deptIdx: 0, unitIdx: 0 },
    { fullName: 'Brother John Doe', email: 'john.doe@trhchurch.org', phone: '+1-555-0102', roleTitle: 'Altar Lead', orgIdx: 0, deptIdx: 0, unitIdx: 0 },
    { fullName: 'Brother David Smith', email: 'david.smith@trhchurch.org', phone: '+1-555-0103', roleTitle: 'Facility Officer', orgIdx: 0, deptIdx: 0, unitIdx: 1 },
    { fullName: 'Sister Grace Okon', email: 'grace.o@trhchurch.org', phone: '+1-555-0104', roleTitle: 'Soprano Lead', orgIdx: 1, deptIdx: 2, unitIdx: 4 },
    { fullName: 'Minister Samuel Adeleke', email: 'samuel.a@trhchurch.org', phone: '+1-555-0105', roleTitle: 'Keyboard Director', orgIdx: 1, deptIdx: 3, unitIdx: 6 },
    { fullName: 'Brother Emmanuel Vance', email: 'emmanuel.v@trhchurch.org', phone: '+1-555-0106', roleTitle: 'Lead Camera Operator', orgIdx: 2, deptIdx: 4, unitIdx: 8 },
    { fullName: 'Sister Deborah Adams', email: 'deborah.a@trhchurch.org', phone: '+1-555-0107', roleTitle: 'Protocol Officer', orgIdx: 3, deptIdx: 6, unitIdx: 10 },
    { fullName: 'Pastor Paul Henderson', email: 'paul.h@trhchurch.org', phone: '+1-555-0108', roleTitle: 'Guest Relations Head', orgIdx: 3, deptIdx: 6, unitIdx: 10 }
  ];

  const createdPeople: Person[] = [];
  for (const p of samplePeople) {
    const org = createdOrgs[p.orgIdx];
    const dept = createdDepts[p.deptIdx];
    const unit = createdUnits[p.unitIdx];
    const person = await createPerson({
      fullName: p.fullName,
      email: p.email,
      phone: p.phone,
      organisationId: org.id,
      organisationName: org.name,
      departmentId: dept.id,
      departmentName: dept.name,
      unitId: unit?.id,
      unitName: unit?.name,
      roleTitle: p.roleTitle,
      status: 'active'
    }, actor);
    createdPeople.push(person);
  }

  // 4. Create Exercise 0: Church-Wide Workforce Member of the Year 2026 (WORKFORCE SCOPE, OPEN & ACTIVE)
  const ex0 = await createVotingExercise({
    title: 'Most Outstanding Workforce Member of the Year — 2026',
    slug: 'most-outstanding-workforce-member-of-the-year-2026',
    description: 'Celebrating transcendent dedication, sacrificial service, spiritual excellence, and kingdom impact across all church wings and ministries.',
    scopeType: 'workforce',
    organisationName: 'Entire Workforce',
    categoryName: 'Church-Wide Annual Excellence',
    status: 'open',
    startTime: pastWeekISO,
    endTime: new Date(now.getTime() + 86400000 * 10).toISOString(),
    resultsPublished: false,
    resultsVisibilityMode: 'admin_only',
    allowSelfVote: false,
    maxVotesPerPerson: 1,
    votingMode: 'single_choice',
    voterSelectionMode: 'all_workforce',
    nomineeSelectionMode: 'manual_selection',
    criteria: [
      { title: 'Consistency and Commitment', description: 'Faithful presence and steadfast devotion across all service units.', order: 1 },
      { title: 'Attendance and Punctuality', description: 'Consistently arrives early and prepared for all church activities and team duties.', order: 2 },
      { title: 'Excellence in Service', description: 'High quality of execution, diligence, and reverence in the house of God.', order: 3 },
      { title: 'Leadership and Initiative', description: 'Proactively identifies needs, inspires others, and solves problems gracefully.', order: 4 },
      { title: 'Teamwork and Collaboration', description: 'Humble, uplifting, and cooperative spirit with fellow workers and leadership.', order: 5 },
      { title: 'Overall Kingdom Impact', description: 'Significant contribution to the growth, order, and spiritual atmosphere of the church.', order: 6 }
    ],
    nominees: [
      {
        displayName: 'Sister Mary Johnson',
        roleOrTitle: 'Senior Steward',
        department: 'Sanctuary Care',
        organisationName: 'Sanctuary & Environment',
        photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
        bio: 'Arrives 1 hour early every Sunday to coordinate sanctuary readiness and altar preparation.',
        personId: createdPeople[0].id,
        order: 1
      },
      {
        displayName: 'Minister Samuel Adeleke',
        roleOrTitle: 'Keyboard Director',
        department: 'Instrumentalists & Band',
        organisationName: 'Music & Worship Ministry',
        photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
        bio: 'Inspiring keyboardist and mentor, providing musical leadership and rehearsal rigor.',
        personId: createdPeople[4].id,
        order: 2
      },
      {
        displayName: 'Brother Emmanuel Vance',
        roleOrTitle: 'Lead Camera Operator',
        department: 'Live Broadcast & Video',
        organisationName: 'Media & Technology',
        photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
        bio: 'Engineered zero-downtime multi-cam streams during annual conferences and conventions.',
        personId: createdPeople[5].id,
        order: 3
      },
      {
        displayName: 'Sister Deborah Adams',
        roleOrTitle: 'Protocol Officer',
        department: 'VIP Guest Protocol',
        organisationName: 'Protocol & Hospitality',
        photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
        bio: 'Graceful hospitality and coordination for visiting ministers and first-time guests.',
        personId: createdPeople[6].id,
        order: 4
      }
    ]
  }, actor);
  await assignEligibilityBatch(ex0.id, createdPeople, actor);

  // 5. Create Exercise 1: Sanctuary Team Member of the Month (ORGANISATION SCOPE, OPEN & ACTIVE)
  const sanctuaryOrg = createdOrgs[0];
  const sanctuaryDept = createdDepts[0];
  const ex1 = await createVotingExercise({
    title: 'Most Outstanding Sanctuary Team Member',
    slug: 'most-outstanding-sanctuary-team-member',
    description: 'Recognizing devotion, punctuality, and diligent service in maintaining God’s sanctuary during this quarter.',
    scopeType: 'organisation',
    organisationId: sanctuaryOrg.id,
    organisationName: sanctuaryOrg.name,
    departmentId: sanctuaryDept.id,
    departmentName: sanctuaryDept.name,
    categoryName: 'Worker of the Month',
    status: 'open',
    startTime: pastWeekISO,
    endTime: tomorrowISO,
    resultsPublished: true,
    allowSelfVote: false,
    votingMode: 'single_choice',
    criteria: [
      { title: 'Consistent Sunday & Midweek Attendance', description: 'Faithful arrival and presence across all services.', order: 1 },
      { title: 'Punctuality & Early Setup', description: 'Arriving at least 45 minutes prior to service kick-off.', order: 2 },
      { title: 'Commitment & Cleanliness Excellence', description: 'Thorough care of altar, seats, and sanctuary aesthetics.', order: 3 },
      { title: 'Teamwork & Uplifting Attitude', description: 'Supportive, humble spirit when collaborating with teammates.', order: 4 }
    ],
    nominees: [
      {
        displayName: 'Sister Mary Johnson',
        roleOrTitle: 'Senior Steward',
        department: sanctuaryDept.name,
        photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
        bio: 'Demonstrated exemplary dedication, arriving 1 hour early every Sunday to lead the morning sanctuary sanitation.',
        personId: createdPeople[0].id,
        order: 1
      },
      {
        displayName: 'Brother John Doe',
        roleOrTitle: 'Altar Lead',
        department: sanctuaryDept.name,
        photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        bio: 'Meticulous coordination of the communion elements and pulpit organization throughout the month.',
        personId: createdPeople[1].id,
        order: 2
      },
      {
        displayName: 'Brother David Smith',
        roleOrTitle: 'Facility Officer',
        department: sanctuaryDept.name,
        photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
        bio: 'Supervised urgent generator maintenance and ensure flawless air conditioning comfort during special revivals.',
        personId: createdPeople[2].id,
        order: 3
      }
    ]
  }, actor);

  // Assign eligibility for all Sanctuary people to ex1
  await assignEligibilityBatch(ex1.id, createdPeople, actor);

  // 6. Create Exercise 2: Music Ministry Vocalist of the Quarter (DEPARTMENT SCOPE, SCHEDULED)
  const musicOrg = createdOrgs[1];
  const choirDept = createdDepts[2];
  const ex2 = await createVotingExercise({
    title: 'Most Committed Choir Vocalist',
    slug: 'most-committed-choir-vocalist',
    description: 'Celebrating vocal excellence, spiritual readiness, and selfless commitment in ministering through song.',
    scopeType: 'department',
    organisationId: musicOrg.id,
    organisationName: musicOrg.name,
    departmentId: choirDept.id,
    departmentName: choirDept.name,
    categoryName: 'Musical Excellence',
    status: 'scheduled',
    startTime: tomorrowISO,
    endTime: new Date(now.getTime() + 86400000 * 14).toISOString(),
    resultsPublished: false,
    allowSelfVote: false,
    votingMode: 'single_choice',
    criteria: [
      { title: 'Vocal Discipline & Rehearsal Attendance', description: 'Never missing Saturday choir rehearsals.', order: 1 },
      { title: 'Spiritual Demeanour & Stage Conduct', description: 'Flowing with the Spirit during altar calls and worship.', order: 2 },
      { title: 'Team Harmony & Repertoire Readiness', description: 'Mastery of assigned voice parts and harmonies.', order: 3 }
    ],
    nominees: [
      {
        displayName: 'Sister Grace Okon',
        roleOrTitle: 'Soprano Lead',
        department: choirDept.name,
        photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        bio: 'Flawless vocal lead during the annual worship concert.',
        personId: createdPeople[3].id,
        order: 1
      },
      {
        displayName: 'Minister Samuel Adeleke',
        roleOrTitle: 'Keyboard Director',
        department: createdDepts[3].name,
        photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
        bio: 'Outstanding chord arrangements and organ accompaniment.',
        personId: createdPeople[4].id,
        order: 2
      }
    ]
  }, actor);
  await assignEligibilityBatch(ex2.id, createdPeople, actor);

  // 7. Create Exercise 3: Media Innovation & Live Stream Award (DEPARTMENT SCOPE, CLOSED / COMPLETED)
  const mediaOrg = createdOrgs[2];
  const streamDept = createdDepts[4];
  const ex3 = await createVotingExercise({
    title: 'Excellence in Broadcast & Visual Technology',
    slug: 'excellence-in-broadcast-visual-technology',
    description: 'Recognizing technical agility and zero-downtime streaming during international conventions.',
    scopeType: 'department',
    organisationId: mediaOrg.id,
    organisationName: mediaOrg.name,
    departmentId: streamDept.id,
    departmentName: streamDept.name,
    categoryName: 'Tech & Media Award',
    status: 'closed',
    startTime: new Date(now.getTime() - 86400000 * 14).toISOString(),
    endTime: yesterdayISO,
    resultsPublished: true,
    allowSelfVote: true,
    votingMode: 'single_choice',
    criteria: [
      { title: 'Technical Precision & Multi-cam Direction', description: 'Zero lag switching and clean broadcast composition.', order: 1 },
      { title: 'Quick Troubleshooting under Pressure', description: 'Rapid resolution of audio/video feedback loops.', order: 2 },
      { title: 'Servant Leadership & Equipment Care', description: 'Proper storage of 4K cameras, lenses, and SDI cables.', order: 3 }
    ],
    nominees: [
      {
        displayName: 'Brother Emmanuel Vance',
        roleOrTitle: 'Lead Camera Operator',
        department: streamDept.name,
        unit: 'Camera Operations Unit',
        photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
        bio: 'Managed the robotic PTZ cameras and gimbal tracking seamlessly.',
        personId: createdPeople[5].id,
        order: 1
      },
      {
        displayName: 'Sister Deborah Adams',
        roleOrTitle: 'Live Graphics & Social Lead',
        department: streamDept.name,
        photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
        bio: 'Crafted dynamic lower-thirds and real-time scripture citation graphics during Sunday sermons.',
        personId: createdPeople[6].id,
        order: 2
      }
    ]
  }, actor);
  await assignEligibilityBatch(ex3.id, createdPeople, actor);

  // 8. Create Exercise 4: Unit-Scoped Award: Altar Care Steward of the Month (UNIT SCOPE, OPEN & ACTIVE)
  const altarUnit = createdUnits[0];
  const ex4 = await createVotingExercise({
    title: 'Altar Care Servant of the Month',
    slug: 'altar-care-servant-of-the-month',
    description: 'Recognizing reverent service and meticulous preparation in the Altar Care Unit under Sanctuary Maintenance.',
    scopeType: 'unit',
    organisationId: sanctuaryOrg.id,
    organisationName: sanctuaryOrg.name,
    departmentId: sanctuaryDept.id,
    departmentName: sanctuaryDept.name,
    unitId: altarUnit.id,
    unitName: altarUnit.name,
    categoryName: 'Unit Excellence Award',
    status: 'open',
    startTime: pastWeekISO,
    endTime: new Date(now.getTime() + 86400000 * 7).toISOString(),
    resultsPublished: false,
    resultsVisibilityMode: 'admin_only',
    allowSelfVote: false,
    votingMode: 'single_choice',
    voterSelectionMode: 'scope_members',
    criteria: [
      { title: 'Altar Reverence & Cleanliness', description: 'Immaculate preparation of pulpit, communion vessels, and stage carpets.', order: 1 },
      { title: 'Early Morning Readiness', description: 'Arriving before 6:30 AM on prayer & communion service days.', order: 2 }
    ],
    nominees: [
      {
        displayName: 'Sister Mary Johnson',
        roleOrTitle: 'Senior Altar Steward',
        department: sanctuaryDept.name,
        unit: altarUnit.name,
        photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
        bio: 'Faithful steward responsible for altar vestments and flower arrangements.',
        personId: createdPeople[0].id,
        order: 1
      },
      {
        displayName: 'Brother John Doe',
        roleOrTitle: 'Altar Setup Lead',
        department: sanctuaryDept.name,
        unit: altarUnit.name,
        photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        bio: 'Coordinates sanctuary oil vessels and communion table readiness.',
        personId: createdPeople[1].id,
        order: 2
      }
    ]
  }, actor);
  await assignEligibilityBatch(ex4.id, createdPeople.slice(0, 3), actor);

  // 9. Create Exercise 5: Church Member of the Year (CHURCH SCOPE, OPEN & ACTIVE)
  const ex5 = await createVotingExercise({
    title: 'Church Member of the Year — Congregation Choice',
    slug: 'church-member-of-the-year-congregation-choice',
    description: 'Celebrating exemplary discipleship, community impact, evangelism, and selfless fellowship across the entire church congregation.',
    scopeType: 'church',
    organisationName: 'Entire Church Congregation',
    categoryName: 'Congregation Choice Award',
    status: 'open',
    startTime: pastWeekISO,
    endTime: new Date(now.getTime() + 86400000 * 12).toISOString(),
    resultsPublished: false,
    resultsVisibilityMode: 'admin_only',
    allowSelfVote: false,
    votingMode: 'single_choice',
    voterSelectionMode: 'all_church',
    criteria: [
      { title: 'Christian Character & Testimony', description: 'Exemplifying Christ-like love, integrity, and humility in daily conduct.', order: 1 },
      { title: 'Community Outreach & Care', description: 'Active compassion, visitation of the sick, and support for church families.', order: 2 },
      { title: 'Faithful Fellowship & Discipleship', description: 'Regular participation in house fellowship and spiritual mentorship.', order: 3 }
    ],
    nominees: [
      {
        displayName: 'Sister Grace Okon',
        roleOrTitle: 'Cell Fellowship Host',
        department: 'Community Life',
        organisationName: 'Fellowship Ministry',
        photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        bio: 'Faithfully hosted weekly prayer cells and organized youth tutoring outreach.',
        personId: createdPeople[3].id,
        order: 1
      },
      {
        displayName: 'Brother David Smith',
        roleOrTitle: 'Outreach Volunteer',
        department: 'Evangelism',
        organisationName: 'Missions & Outreach',
        photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
        bio: 'Led street feeding programs and new convert follow-up initiatives.',
        personId: createdPeople[2].id,
        order: 2
      }
    ]
  }, actor);
  await assignEligibilityBatch(ex5.id, createdPeople, actor);

  // 10. Create Exercise 6: Leadership Excellence Award (CUSTOM SCOPE, OPEN & ACTIVE)
  const ex6 = await createVotingExercise({
    title: 'Pastoral & Ministry Leadership Excellence Award',
    slug: 'pastoral-ministry-leadership-excellence-award',
    description: 'A custom recognition category for exceptional strategic leadership, vision execution, and shepherd care across specialized church initiatives.',
    scopeType: 'custom',
    categoryName: 'Leadership Excellence',
    status: 'open',
    startTime: pastWeekISO,
    endTime: new Date(now.getTime() + 86400000 * 8).toISOString(),
    resultsPublished: false,
    resultsVisibilityMode: 'admin_only',
    allowSelfVote: false,
    votingMode: 'single_choice',
    voterSelectionMode: 'manual_selection',
    criteria: [
      { title: 'Vision Alignment & Stewardship', description: 'Executing ministerial mandates with spiritual foresight and diligence.', order: 1 },
      { title: 'Mentorship & Succession Building', description: 'Empowering junior workers and establishing thriving department systems.', order: 2 }
    ],
    nominees: [
      {
        displayName: 'Minister Samuel Adeleke',
        roleOrTitle: 'Associate Director of Music',
        department: 'Music Department',
        organisationName: 'Music & Worship Ministry',
        photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
        bio: 'Pioneered the youth choir masterclass and elevated Sunday musical arrangements.',
        personId: createdPeople[4].id,
        order: 1
      },
      {
        displayName: 'Brother Emmanuel Vance',
        roleOrTitle: 'Technical Operations Director',
        department: 'Live Broadcast & Video',
        organisationName: 'Media & Technology',
        photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
        bio: 'Designed and deployed the hybrid sanctuary audio/video streaming infrastructure.',
        personId: createdPeople[5].id,
        order: 2
      }
    ]
  }, actor);
  await assignEligibilityBatch(ex6.id, createdPeople.slice(0, 5), actor);

  // Seed sample initial votes for ex1 & ex3
  try {
    const ex1Nominees = await getNominees(ex1.id);
    if (ex1Nominees.length >= 2) {
      await submitVote(ex1.id, ex1Nominees[0].id, {
        personId: createdPeople[3].id,
        voterName: createdPeople[3].fullName,
        voterCode: createdPeople[3].voterCode
      });
      await submitVote(ex1.id, ex1Nominees[0].id, {
        personId: createdPeople[4].id,
        voterName: createdPeople[4].fullName,
        voterCode: createdPeople[4].voterCode
      });
      await submitVote(ex1.id, ex1Nominees[1].id, {
        personId: createdPeople[5].id,
        voterName: createdPeople[5].fullName,
        voterCode: createdPeople[5].voterCode
      });
    }

    const ex3Nominees = await getNominees(ex3.id);
    if (ex3Nominees.length >= 2) {
      await submitVote(ex3.id, ex3Nominees[0].id, {
        personId: createdPeople[0].id,
        voterName: createdPeople[0].fullName,
        voterCode: createdPeople[0].voterCode
      });
      await submitVote(ex3.id, ex3Nominees[0].id, {
        personId: createdPeople[1].id,
        voterName: createdPeople[1].fullName,
        voterCode: createdPeople[1].voterCode
      });
      await submitVote(ex3.id, ex3Nominees[1].id, {
        personId: createdPeople[2].id,
        voterName: createdPeople[2].fullName,
        voterCode: createdPeople[2].voterCode
      });
    }
  } catch (err) {
    console.warn('Initial demo votes seeding caught:', err);
  }

  await logAuditEvent(actor, 'Seeded Realistic Church Demo Data', 'system', 'seed', 'Populated multi-organisation CMS with Sanctuary, Music, Media, and Protocol departments and exercises.');
}

// ==========================================
// ==========================================
// USER ACCOUNTS & RBAC MANAGEMENT
// ==========================================
export async function ensureOfficialAccounts(): Promise<UserAccount[]> {
  try {
    const usersRef = collection(db, 'users');
    const snap = await getDocs(usersRef);
    const existingUsers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserAccount));
    const now = new Date().toISOString();

    // Only bootstrap initial default accounts if no users exist at all
    if (existingUsers.length === 0) {
      // 1. Create Super Admin account
      const docRef = doc(usersRef);
      const newSuperAdmin: UserAccount = {
        id: docRef.id,
        fullName: SUPER_ADMIN_OFFICIAL_USERNAME,
        username: SUPER_ADMIN_OFFICIAL_USERNAME,
        password: 'admin123',
        email: 'ict.director@trhworkforce.org',
        role: 'super_admin',
        status: 'active',
        createdAt: now,
        updatedAt: now,
        createdBy: 'system_init'
      };
      await setDoc(docRef, cleanFirestoreData(newSuperAdmin));
      existingUsers.push(newSuperAdmin);

      // 2. Create the other official accounts
      for (const official of OFFICIAL_USERS_LIST) {
        if (official.username === SUPER_ADMIN_OFFICIAL_USERNAME) continue;
        const oRef = doc(usersRef);
        const newAccount: UserAccount = {
          id: oRef.id,
          fullName: official.fullName,
          username: official.username,
          password: 'admin123',
          email: `${official.username.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@trhworkforce.org`,
          role: official.role,
          status: 'active',
          createdAt: now,
          updatedAt: now,
          createdBy: 'system_init'
        };
        await setDoc(oRef, cleanFirestoreData(newAccount));
        existingUsers.push(newAccount);
      }
    }

    dbCache.invalidate('user_accounts');
    return existingUsers;
  } catch (error) {
    console.error('Error ensuring official accounts:', error);
    return [];
  }
}

export async function getUserAccounts(forceRefresh = false): Promise<UserAccount[]> {
  const cacheKey = 'user_accounts';
  if (!forceRefresh) {
    const cached = dbCache.get<UserAccount[]>(cacheKey);
    if (cached) return cached;
  }

  try {
    const usersRef = collection(db, 'users');
    const snap = await getDocs(usersRef);
    let users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserAccount));

    // If completely empty, bootstrap initial accounts once
    if (users.length === 0) {
      users = await ensureOfficialAccounts();
    }

    // Sort super_admin first, then official usernames order, then by createdAt desc
    users.sort((a, b) => {
      if (a.role === 'super_admin' && b.role !== 'super_admin') return -1;
      if (b.role === 'super_admin' && a.role !== 'super_admin') return 1;

      const indexA = OFFICIAL_USERNAMES.indexOf(a.username as any);
      const indexB = OFFICIAL_USERNAMES.indexOf(b.username as any);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    dbCache.set(cacheKey, users, 86400000); // 24 hours TTL
    return users;
  } catch (error) {
    console.error('Error getting user accounts:', error);
    return [];
  }
}

export async function getUserAccountById(id: string, forceRefresh = false): Promise<UserAccount | null> {
  const cacheKey = `user_doc_${id}`;
  if (!forceRefresh) {
    const cached = dbCache.get<UserAccount>(cacheKey);
    if (cached) return cached;
  }

  try {
    const docRef = doc(db, 'users', id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() } as UserAccount;
      dbCache.set(cacheKey, data, 86400000); // 24 hours TTL
      return data;
    }
    return null;
  } catch (error) {
    console.error(`Error getting user account ${id}:`, error);
    return null;
  }
}

export async function getUserAccountByUsername(username: string): Promise<UserAccount | null> {
  try {
    const cleanUsername = username.trim().toLowerCase();
    const users = await getUserAccounts();
    return users.find(u => u.username?.trim().toLowerCase() === cleanUsername) || null;
  } catch (error) {
    console.error(`Error finding user by username ${username}:`, error);
    return null;
  }
}

export async function createUserAccount(
  data: Omit<UserAccount, 'id' | 'createdAt' | 'updatedAt'>,
  actor: { id: string; name: string; email?: string }
): Promise<UserAccount> {
  const usersRef = collection(db, 'users');
  const docRef = doc(usersRef);
  const now = new Date().toISOString();
  
  // Clean username - preserving original casing and spaces/characters
  const cleanUsername = data.username.trim();
  
  // Check unique username (case-insensitive)
  const existing = await getUserAccountByUsername(cleanUsername);
  if (existing) {
    throw new Error(`Username '${cleanUsername}' is already taken. Please choose another username or Login ID.`);
  }

  const userAccount: UserAccount = {
    ...data,
    id: docRef.id,
    username: cleanUsername,
    password: data.password || 'admin123',
    status: data.status || 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: actor.id
  };

  await setDoc(docRef, cleanFirestoreData(userAccount));
  dbCache.invalidate('user_accounts');
  await logAuditEvent(
    actor,
    'Created User Account',
    'system',
    userAccount.id,
    `Super Admin created ${userAccount.role} account for ${userAccount.fullName} (@${userAccount.username})`,
    { username: userAccount.username, role: userAccount.role }
  );

  return userAccount;
}

export async function updateUserAccount(
  id: string,
  data: Partial<UserAccount>,
  actor: { id: string; name: string; email?: string }
): Promise<void> {
  const docRef = doc(db, 'users', id);
  const now = new Date().toISOString();
  
  if (data.username) {
    const cleanUsername = data.username.trim();
    const existing = await getUserAccountByUsername(cleanUsername);
    if (existing && existing.id !== id) {
      throw new Error(`Username '${cleanUsername}' is already assigned to another user.`);
    }
    data.username = cleanUsername;
  }

  const payload = cleanFirestoreData({
    ...data,
    updatedAt: now
  });

  await updateDoc(docRef, payload);
  dbCache.invalidate('user_accounts');
  dbCache.invalidate(`user_doc_${id}`);
  await logAuditEvent(
    actor,
    'Updated User Account',
    'system',
    id,
    `Updated account details for user ID ${id}${data.username ? ` (Username: @${data.username})` : ''}`,
    { updatedFields: Object.keys(data), newUsername: data.username }
  );
}

export async function deleteUserAccount(
  id: string,
  actor: { id: string; name: string; email?: string; role?: string }
): Promise<void> {
  assertSuperAdmin(actor, 'user accounts');
  const targetUser = await getUserAccountById(id);
  const docRef = doc(db, 'users', id);
  await deleteDoc(docRef);
  dbCache.invalidate('user_accounts');
  dbCache.invalidate(`user_doc_${id}`);
  await logAuditEvent(
    actor,
    'Deleted User Account',
    'system',
    id,
    `Super Admin removed user account: ${targetUser?.fullName || id} (@${targetUser?.username || 'unknown'})`
  );
}

export async function verifyAdminCredentials(
  usernameInput: string,
  passwordInput: string
): Promise<{ success: boolean; user?: UserAccount; message?: string }> {
  try {
    const rawUsername = usernameInput.trim();
    const cleanUsername = rawUsername.toLowerCase();
    const password = passwordInput.trim();

    if (!rawUsername || !password) {
      return { success: false, message: 'Please select or enter an Official Username and password.' };
    }

    const allUsers = await getUserAccounts();

    // 1. Direct match by username or fullName (case-insensitive)
    let matchedUser = allUsers.find(
      u => u.username?.trim().toLowerCase() === cleanUsername || 
           u.fullName?.trim().toLowerCase() === cleanUsername
    );

    // 2. Fallback: if username matches default super admin title or "superadmin", allow matching active super_admin
    if (!matchedUser && (
      cleanUsername === 'superadmin' ||
      cleanUsername === SUPER_ADMIN_OFFICIAL_USERNAME.toLowerCase() ||
      cleanUsername.includes('executive director, information, communication & technology')
    )) {
      matchedUser = allUsers.find(u => u.role === 'super_admin');
    }

    if (!matchedUser) {
      return { success: false, message: 'Administrative account not found. Please select an Official Username.' };
    }

    if (matchedUser.password !== password) {
      return { success: false, message: 'Invalid password. Access denied.' };
    }

    if (matchedUser.status === 'inactive' || matchedUser.status === 'archived') {
      return { success: false, message: 'This administrative account is disabled or archived. Please contact the Super Admin.' };
    }

    // Update lastLoginAt
    try {
      await updateDoc(doc(db, 'users', matchedUser.id), {
        lastLoginAt: new Date().toISOString()
      });
    } catch (e) {
      // ignore non-critical update failure
    }

    return { success: true, user: matchedUser };
  } catch (error: any) {
    console.error('Error verifying admin credentials:', error);
    return { success: false, message: error.message || 'Authentication error. Please try again.' };
  }
}

