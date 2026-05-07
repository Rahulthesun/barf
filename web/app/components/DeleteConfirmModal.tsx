"use client";

import { Trash2, RefreshCw } from "lucide-react";

export function DeleteConfirmModal({
  appName,
  onConfirm,
  onCancel,
}: {
  appName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-sm w-full mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Delete {appName}?
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
              This will permanently destroy your{" "}
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{appName}</span>{" "}
              container and{" "}
              <span className="font-semibold text-red-600 dark:text-red-400">all its data</span>.
              There is no way to recover it.
            </p>
          </div>
          <div className="flex gap-2 w-full pt-1">
            <button
              onClick={onCancel}
              className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white py-2.5 text-sm font-semibold transition-colors"
            >
              Delete &amp; lose all data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RedeployConfirmModal({
  appName,
  onConfirm,
  onCancel,
}: {
  appName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-sm w-full mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Redeploy {appName}?
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
              This will destroy your current container and{" "}
              <span className="font-semibold text-amber-600 dark:text-amber-400">all its data</span>,
              then fresh-install{" "}
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{appName}</span>.
              There is no way to recover existing data.
            </p>
          </div>
          <div className="flex gap-2 w-full pt-1">
            <button
              onClick={onCancel}
              className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white py-2.5 text-sm font-semibold transition-colors"
            >
              Redeploy from scratch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
