import React from 'react';
import { IndexingStatus } from '../types';

interface Stats {
    total: number;
    indexed: number;
    pending: number;
    submitted: number;
    failed: number;
}

interface StatusSummaryProps {
    stats: Stats;
}

const statusBadgeStyles: { [key: string]: string } = {
    [IndexingStatus.INDEXED]: 'bg-green-900/80 text-green-300 border-green-700/50',
    [IndexingStatus.PENDING]: 'bg-slate-700/80 text-slate-300 border-slate-600/50',
    [IndexingStatus.SUBMITTED]: 'bg-blue-900/80 text-blue-300 border-blue-700/50',
    [IndexingStatus.FAILED]: 'bg-red-900/80 text-red-300 border-red-700/50',
    'TOTAL': 'bg-slate-800/80 text-indigo-400 border-indigo-700/50'
};

const StatusSummary: React.FC<StatusSummaryProps> = ({ stats }) => {
    if (stats.total === 0) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-3 mb-6 border-b border-slate-700 pb-4">
            <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${statusBadgeStyles['TOTAL']}`}>
                Total: {stats.total}
            </span>
             <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${statusBadgeStyles[IndexingStatus.INDEXED]}`}>
                Indexed: {stats.indexed}
            </span>
            <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${statusBadgeStyles[IndexingStatus.PENDING]}`}>
                Pending: {stats.pending}
            </span>
            <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${statusBadgeStyles[IndexingStatus.FAILED]}`}>
                Failed: {stats.failed}
            </span>
        </div>
    );
};

export default StatusSummary;