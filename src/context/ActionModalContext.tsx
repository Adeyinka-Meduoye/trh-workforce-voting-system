import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  PlusCircle,
  Eye,
  RefreshCw,
  Trash2,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  X,
  UserCheck
} from 'lucide-react';

export type AdminActionType = 'create' | 'read' | 'update' | 'delete' | 'logout' | 'error';

export interface ActionModalPayload {
  type: AdminActionType;
  title: string;
  details: string;
  resourceType?: string;
  resourceName?: string;
  actorName?: string;
  actorRole?: string;
  timestamp?: string;
  autoCloseMs?: number;
  data?: Record<string, any>;
}

export interface ConfirmModalPayload {
  type?: AdminActionType;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isDanger?: boolean;
  onConfirm: () => Promise<void> | void;
}

interface ActionModalContextType {
  notifyAction: (
    payloadOrTitle: ActionModalPayload | string,
    details?: string,
    type?: AdminActionType | 'success' | 'info' | 'error' | 'warning',
    resourceName?: string
  ) => void;
  confirmAction: (
    payloadOrTitle: ConfirmModalPayload | string,
    message?: string,
    onConfirm?: () => Promise<void> | void,
    isDestructive?: boolean
  ) => void;
  closeModal: () => void;
}

const ActionModalContext = createContext<ActionModalContextType | undefined>(undefined);

export const ActionModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<ActionModalPayload | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<ConfirmModalPayload | null>(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  const notifyAction = useCallback(
    (
      payloadOrTitle: ActionModalPayload | string,
      details?: string,
      type?: AdminActionType | 'success' | 'info' | 'error' | 'warning',
      resourceName?: string
    ) => {
      let payload: ActionModalPayload;
      if (typeof payloadOrTitle === 'string') {
        let actionType: AdminActionType = 'update';
        if (type === 'create') actionType = 'create';
        else if (type === 'read') actionType = 'read';
        else if (type === 'delete' || type === 'error') actionType = 'delete';
        else if (type === 'logout') actionType = 'logout';
        else if (type === 'success' || type === 'info') actionType = 'update';

        payload = {
          type: actionType,
          title: payloadOrTitle,
          details: details || '',
          resourceName
        };
      } else {
        payload = payloadOrTitle;
      }

      setNotification({
        ...payload,
        timestamp:
          payload.timestamp ||
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
    },
    []
  );

  const confirmAction = useCallback(
    (
      payloadOrTitle: ConfirmModalPayload | string,
      message?: string,
      onConfirm?: () => Promise<void> | void,
      isDestructive?: boolean
    ) => {
      if (typeof payloadOrTitle === 'string') {
        setConfirmConfig({
          type: isDestructive ? 'delete' : 'update',
          title: payloadOrTitle,
          message: message || '',
          onConfirm: onConfirm || (() => {}),
          isDestructive
        });
      } else {
        setConfirmConfig(payloadOrTitle);
      }
    },
    []
  );

  const closeModal = useCallback(() => {
    setNotification(null);
    setConfirmConfig(null);
    setIsConfirmLoading(false);
  }, []);

  const handleExecuteConfirm = async () => {
    if (!confirmConfig) return;
    try {
      setIsConfirmLoading(true);
      await confirmConfig.onConfirm();
      setConfirmConfig(null);
    } catch (err) {
      console.error('Error during confirmed action:', err);
    } finally {
      setIsConfirmLoading(false);
    }
  };

  const getActionBadge = (type: AdminActionType) => {
    switch (type) {
      case 'create':
        return {
          icon: <PlusCircle className="w-6 h-6 text-emerald-400" />,
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          titleColor: 'text-emerald-400',
          label: 'CREATE ACTION LOGGED'
        };
      case 'read':
        return {
          icon: <Eye className="w-6 h-6 text-sky-400" />,
          bg: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
          titleColor: 'text-sky-400',
          label: 'READ / ACCESS ACTION'
        };
      case 'update':
        return {
          icon: <RefreshCw className="w-6 h-6 text-[#FF8A00]" />,
          bg: 'bg-[#FF8A00]/10 border-[#FF8A00]/30 text-[#FF8A00]',
          titleColor: 'text-[#FF8A00]',
          label: 'UPDATE ACTION EXECUTED'
        };
      case 'delete':
        return {
          icon: <Trash2 className="w-6 h-6 text-rose-400" />,
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          titleColor: 'text-rose-400',
          label: 'DELETE / PURGE ACTION'
        };
      case 'logout':
        return {
          icon: <LogOut className="w-6 h-6 text-purple-400" />,
          bg: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
          titleColor: 'text-purple-400',
          label: 'SESSION LOGOUT ACTION'
        };
      case 'error':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-rose-400" />,
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          titleColor: 'text-rose-400',
          label: 'OPERATION ERROR'
        };
      default:
        return {
          icon: <CheckCircle2 className="w-6 h-6 text-[#FF8A00]" />,
          bg: 'bg-[#FF8A00]/10 border-[#FF8A00]/30 text-[#FF8A00]',
          titleColor: 'text-[#FF8A00]',
          label: 'SYSTEM ACTION'
        };
    }
  };

  return (
    <ActionModalContext.Provider value={{ notifyAction, confirmAction, closeModal }}>
      {children}

      {/* 1. ACTION NOTIFICATION POPUP MODAL */}
      {notification && (
        <div className="fixed inset-0 z-[100] bg-[#0A051B]/70 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div
            id="admin-action-popup-modal"
            className="bg-[#1E293B] border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 text-slate-100 animate-scaleUp relative overflow-hidden"
          >
            {/* Ambient Background Accent Glow */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-44 h-44 bg-[#FF8A00]/15 rounded-full blur-3xl pointer-events-none"></div>

            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title="Close notification"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header with Type Badge */}
            {(() => {
              const badge = getActionBadge(notification.type);
              return (
                <div className="flex items-start gap-4">
                  <div className={`p-3.5 rounded-2xl border ${badge.bg} shrink-0`}>
                    {badge.icon}
                  </div>
                  <div className="flex-1 pr-6">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border mb-1.5 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {badge.label}
                    </div>
                    <h3 className="text-lg font-bold font-display text-[#F8FAFC]">
                      {notification.title}
                    </h3>
                  </div>
                </div>
              );
            })()}

            {/* Content & Details Panel */}
            <div className="bg-[#0F172A]/80 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
              <p className="text-slate-300 leading-relaxed font-sans">
                {notification.details}
              </p>

              {notification.resourceName && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                  <span className="text-slate-400 font-semibold">Target Entity:</span>
                  <span className="font-mono text-[#FF8A00] font-bold bg-[#FF8A00]/10 px-2 py-0.5 rounded">
                    {notification.resourceName}
                  </span>
                </div>
              )}

              {/* Extended Entity Attributes Grid (for READ / INSPECT actions) */}
              {notification.data && Object.keys(notification.data).length > 0 && (
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                    Entity Attributes:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#080d1a]/80 p-3 rounded-xl border border-slate-800/80">
                    {Object.entries(notification.data).map(([key, val]) => (
                      <div key={key} className="flex flex-col text-[11px]">
                        <span className="text-slate-400 text-[10px] font-medium">{key}</span>
                        <span className="font-semibold text-slate-100 font-mono truncate">
                          {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val ?? '—')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Executed by: <strong className="text-slate-200">{notification.actorName || 'Super Admin'}</strong>{' '}
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-300 uppercase">
                      {notification.actorRole || 'super_admin'}
                    </span>
                  </span>
                </div>
                <span className="font-mono text-slate-500">{notification.timestamp}</span>
              </div>
            </div>

            {/* Footer Action */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Synchronized & Logged to Audit Trail</span>
              </div>

              <button
                id="btn-dismiss-action-modal"
                type="button"
                onClick={closeModal}
                className="px-5 py-2 bg-gradient-to-r from-[#FF8A00] to-[#E85B00] hover:opacity-95 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-[#FF8A00]/20 cursor-pointer"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CONFIRMATION PROMPT MODAL (FOR DELETE, PURGE, LOGOUT) */}
      {confirmConfig && (
        <div className="fixed inset-0 z-[100] bg-[#0A051B]/75 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div
            id="admin-confirm-action-modal"
            className="bg-[#1E293B] border border-slate-700/80 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5 text-slate-100 animate-scaleUp relative"
          >
            <div className="flex items-start gap-4">
              <div
                className={`p-3.5 rounded-2xl border shrink-0 ${
                  confirmConfig.type === 'logout'
                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {confirmConfig.type === 'logout' ? (
                  <LogOut className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 font-mono">
                  ACTION CONFIRMATION
                </span>
                <h3 className="text-lg font-bold font-display text-[#F8FAFC] mt-0.5">
                  {confirmConfig.title}
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#0F172A]/80 border border-slate-800 p-4 rounded-2xl">
              {confirmConfig.message}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isConfirmLoading}
                onClick={closeModal}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                {confirmConfig.cancelLabel || 'Cancel'}
              </button>

              <button
                id="btn-confirm-action-execute"
                type="button"
                disabled={isConfirmLoading}
                onClick={handleExecuteConfirm}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                  confirmConfig.type === 'logout'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white'
                    : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white'
                }`}
              >
                {isConfirmLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{confirmConfig.confirmLabel || 'Confirm Action'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </ActionModalContext.Provider>
  );
};

export const useActionModal = () => {
  const context = useContext(ActionModalContext);
  if (!context) {
    throw new Error('useActionModal must be used within an ActionModalProvider');
  }
  return context;
};
