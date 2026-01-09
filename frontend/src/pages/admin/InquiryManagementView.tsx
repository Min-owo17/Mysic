import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supportApi } from '../../services/api/support';
import { SupportResponse } from '../../types';
import InquiryDetailModal from '../../components/admin/InquiryDetailModal';

function InquiryManagementView() {
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>('all'); // all, pending, answered
    const [selectedInquiry, setSelectedInquiry] = useState<SupportResponse | null>(null);
    const pageSize = 10;

    const { data, isLoading, isError } = useQuery({
        queryKey: ['adminInquiries', page, statusFilter],
        queryFn: () => supportApi.getAdminInquiries(page, pageSize, statusFilter === 'all' ? undefined : statusFilter),
    });

    const handleFilterChange = (status: string) => {
        setStatusFilter(status);
        setPage(1);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (isError) {
        return <div className="text-center text-red-500 py-10">데이터를 불러오는데 실패했습니다.</div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">문의/제안 관리</h1>

            {/* 필터 탭 */}
            <div className="flex space-x-2 mb-6">
                <button
                    onClick={() => handleFilterChange('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'all'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                >
                    전체
                </button>
                <button
                    onClick={() => handleFilterChange('pending')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'pending'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                >
                    대기중
                </button>
                <button
                    onClick={() => handleFilterChange('answered')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'answered'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                >
                    답변완료
                </button>
            </div>

            {/* 테이블 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300">
                            <tr>
                                <th className="p-4 font-semibold border-b dark:border-gray-700 w-16 text-center hidden md:table-cell">ID</th>
                                <th className="p-4 font-semibold border-b dark:border-gray-700 w-24">유형</th>
                                <th className="p-4 font-semibold border-b dark:border-gray-700">제목</th>
                                <th className="p-4 font-semibold border-b dark:border-gray-700 w-32 hidden md:table-cell">작성자</th>
                                <th className="p-4 font-semibold border-b dark:border-gray-700 w-32 hidden md:table-cell">작성일</th>
                                <th className="p-4 font-semibold border-b dark:border-gray-700 w-24 text-center">상태</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {data?.supports.map((item) => (
                                <tr
                                    key={item.support_id}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                                    onClick={() => setSelectedInquiry(item)}
                                >
                                    <td className="p-4 text-center text-gray-500 dark:text-gray-400 hidden md:table-cell">
                                        {item.support_id}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.type === 'inquiry'
                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                            }`}>
                                            {item.type === 'inquiry' ? '문의' : '제안'}
                                        </span>
                                    </td>
                                    <td className="p-4 font-medium text-gray-900 dark:text-white truncate max-w-xs md:max-w-md">
                                        {item.title}
                                    </td>
                                    <td className="p-4 text-gray-600 dark:text-gray-300 hidden md:table-cell">
                                        {item.user?.nickname || 'Unknown'}
                                    </td>
                                    <td className="p-4 text-gray-500 dark:text-gray-400 text-sm hidden md:table-cell">
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-center">
                                        {item.status === 'answered' ? (
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                완료
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                                대기
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {data?.supports.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                        문의 내역이 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 페이지네이션 */}
            <div className="flex justify-center mt-6 space-x-2">
                <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50"
                >
                    이전
                </button>
                <span className="px-4 py-1 text-gray-700 dark:text-gray-300">
                    {page} / {Math.max(1, Math.ceil((data?.total || 0) / pageSize))}
                </span>
                <button
                    onClick={() => setPage(p => Math.min(Math.ceil((data?.total || 0) / pageSize), p + 1))}
                    disabled={page >= Math.ceil((data?.total || 0) / pageSize)}
                    className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50"
                >
                    다음
                </button>
            </div>

            {/* 상세 모달 */}
            {selectedInquiry && (
                <InquiryDetailModal
                    inquiry={selectedInquiry}
                    onClose={() => setSelectedInquiry(null)}
                />
            )}
        </div>
    );
}

export default InquiryManagementView;
