import { useEffect, useState } from "react";
import {
    FiBell,
    FiTrash2,
    FiCheckCircle,
    FiAlertCircle,
    FiChevronRight,
} from "react-icons/fi";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebase";
import Layout from "../components/Layout";

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState([]);
    const [filter, setFilter] = useState("all"); // all | unread
    const [selectedNotification, setSelectedNotification] = useState(null);

    useEffect(() => {
        const auth = getAuth();
        const unsub = auth.onAuthStateChanged((user) => {
            if (!user) return;

            const alertsRef = collection(db, "users", user.uid, "alerts");
            const q = query(alertsRef, orderBy("timestamp", "desc"));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const list = snapshot.docs.map((docSnap) => {
                    const data = docSnap.data();
                    const timestamp =
                        (data.timestamp?._seconds ?? data.timestamp?.seconds) * 1000;

                    return {
                        id: docSnap.id,
                        title:
                            data.type === "fire"
                                ? `Phát hiện cháy tại ${data.cameraName || "camera"}`
                                : data.type === "smoke"
                                    ? `Phát hiện khói tại ${data.cameraName || "camera"}`
                                    : `Cảnh báo khác`,
                        time: timestamp
                            ? new Date(timestamp).toLocaleString("vi-VN")
                            : "Không xác định",
                        timestamp: timestamp,
                        type: data.type,
                        location: data.location || "Không xác định",
                        cameraName: data.cameraName || "Camera",
                        imageUrl: data.imageUrl || null,
                        read: data.read ?? false,
                    };
                });

                // Filter to show only today's notifications
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayTimestamp = today.getTime();

                const todayNotifications = list.filter((n) => n.timestamp >= todayTimestamp);

                setNotifications(todayNotifications);
            });

            return () => unsubscribe();
        });

        return () => unsub();
    }, []);

    // Mark as read
    const markAsRead = async (id) => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        try {
            const ref = doc(db, "users", user.uid, "alerts", id);
            await updateDoc(ref, { read: true });
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read: true } : n))
            );
        } catch (err) {
            console.error("🔥 Lỗi cập nhật trạng thái đọc:", err);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        try {
            const unread = notifications.filter((n) => !n.read);
            await Promise.all(
                unread.map((n) =>
                    updateDoc(doc(db, "users", user.uid, "alerts", n.id), {
                        read: true,
                    })
                )
            );
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        } catch (err) {
            console.error("🔥 Lỗi đánh dấu tất cả đã đọc:", err);
        }
    };

    // Delete notification
    const deleteNotification = async (id) => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        try {
            await deleteDoc(doc(db, "users", user.uid, "alerts", id));
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        } catch (err) {
            console.error("🔥 Lỗi khi xóa thông báo:", err);
        }
    };

    // Filter only recent notifications (last 24 hours for unread filter)
    const filteredNotifications = notifications.filter((n) => {
        if (filter === "unread") return !n.read;
        return true;
    });

    const unreadCount = notifications.filter((n) => !n.read).length;

    // Detail View
    if (selectedNotification) {
        const n = selectedNotification;
        return (
            <Layout>
                <div className="max-w-3xl mx-auto p-6">
                    <button
                        onClick={() => setSelectedNotification(null)}
                        className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="font-medium">Quay lại</span>
                    </button>

                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
                        {/* Header */}
                        <div className={`p-6 ${n.type === "fire"
                            ? "bg-red-500/20 border-b border-red-500/30"
                            : "bg-gray-500/20 border-b border-gray-500/30"
                            }`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${n.type === "fire" ? "bg-red-500/30" : "bg-gray-500/30"}`}>
                                    <FiAlertCircle className={n.type === "fire" ? "text-red-400" : "text-gray-400"} size={28} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">{n.title}</h2>
                                    <p className="text-sm text-gray-400">{n.time}</p>
                                </div>
                            </div>
                        </div>

                        {/* Image */}
                        {n.imageUrl && (
                            <div className="border-b border-[#2a2a2a]">
                                <img src={n.imageUrl} alt="alert" className="w-full h-80 object-cover" />
                            </div>
                        )}

                        {/* Details */}
                        <div className="p-6 space-y-4">
                            <div className="bg-[#252525] border border-[#333333] rounded-lg p-4">
                                <p className="text-sm text-gray-400 mb-1">📍 Vị trí</p>
                                <p className="font-semibold text-white">{n.location}</p>
                            </div>
                            <div className="bg-[#252525] border border-[#333333] rounded-lg p-4">
                                <p className="text-sm text-gray-400 mb-1">📹 Camera</p>
                                <p className="font-semibold text-white">{n.cameraName}</p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-[#252525] border-t border-[#333333] flex justify-between">
                            <button
                                onClick={() => setSelectedNotification(null)}
                                className="px-5 py-2.5 bg-[#333333] border border-[#444444] text-gray-300 rounded-lg font-medium hover:bg-[#3a3a3a] transition"
                            >
                                Đóng
                            </button>
                            {!n.read && (
                                <button
                                    onClick={() => { markAsRead(n.id); setSelectedNotification(null); }}
                                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                                >
                                    Đánh dấu đã đọc
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    // List View
    return (
        <Layout>
            <div className="max-w-4xl mx-auto p-6">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-white mb-3 flex items-center justify-center gap-3">
                        <FiBell size={32} className="text-blue-400" />
                        Thông báo
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Các cảnh báo mới trong ngày hôm nay
                    </p>
                </div>

                {/* Stats & Actions Bar */}
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-6">
                            <div>
                                <div className="text-sm text-gray-400">Hôm nay</div>
                                <div className="text-2xl font-bold text-white">{notifications.length}</div>
                            </div>
                            <div className="h-12 w-px bg-[#333333]"></div>
                            <div>
                                <div className="text-sm text-gray-400">Chưa đọc</div>
                                <div className="text-2xl font-bold text-orange-400">{unreadCount}</div>
                            </div>
                        </div>

                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
                            >
                                <FiCheckCircle size={18} />
                                Đánh dấu tất cả đã đọc
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-6">
                    {[
                        { label: "Tất cả", value: "all", count: notifications.length },
                        { label: "Chưa đọc", value: "unread", count: unreadCount },
                    ].map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setFilter(tab.value)}
                            className={`px-5 py-2.5 rounded-lg font-medium transition-all ${filter === tab.value
                                ? "bg-blue-600 text-white"
                                : "bg-[#252525] border border-[#333333] text-gray-300 hover:bg-[#2a2a2a]"
                                }`}
                        >
                            {tab.label} ({tab.count})
                        </button>
                    ))}
                </div>

                {/* Notifications Timeline */}
                {filteredNotifications.length === 0 ? (
                    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-12 text-center">
                        <div className="w-20 h-20 bg-[#252525] rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiBell size={40} className="text-gray-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">
                            Không có thông báo
                        </h3>
                        <p className="text-gray-500">
                            {filter === "unread" ? "Bạn đã đọc hết thông báo" : "Chưa có thông báo nào"}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            {/* Show only first 10 notifications */}
                            {filteredNotifications.slice(0, 10).map((n) => (
                                <div
                                    key={n.id}
                                    className={`group cursor-pointer border rounded-xl p-5 transition-all hover:-translate-y-0.5 ${n.read
                                        ? "bg-[#1a1a1a] border-[#2a2a2a]"
                                        : "bg-[#1e1e1e] border-blue-500/50"
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div
                                            className="flex items-center gap-4 flex-1"
                                            onClick={() => { if (!n.read) markAsRead(n.id); setSelectedNotification(n); }}
                                        >
                                            {/* Icon */}
                                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${n.type === "fire"
                                                ? "bg-red-500/20"
                                                : "bg-gray-500/20"
                                                }`}>
                                                <FiAlertCircle className={n.type === "fire" ? "text-red-400" : "text-gray-400"} size={24} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className={`font-semibold ${n.read ? "text-gray-300" : "text-white"}`}>
                                                        {n.title}
                                                    </p>
                                                    {!n.read && (
                                                        <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">Mới</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                                    <span>📍 {n.location}</span>
                                                    <span>•</span>
                                                    <span>⏰ {n.time}</span>
                                                </div>
                                            </div>

                                            {/* Arrow */}
                                            <FiChevronRight className="text-gray-500 group-hover:text-blue-400 transition" size={20} />
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 ml-4">
                                            {!n.read && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                                                    className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition"
                                                    title="Đánh dấu đã đọc"
                                                >
                                                    <FiCheckCircle size={20} />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); if (confirm("Xóa thông báo này?")) deleteNotification(n.id); }}
                                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition"
                                                title="Xóa"
                                            >
                                                <FiTrash2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* View Full History Button - At Bottom */}
                        <div className="mt-6 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 text-center">
                            <a
                                href="/alert"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Xem lịch sử đầy đủ
                            </a>
                            <p className="text-xs text-gray-500 mt-2">
                                {filteredNotifications.length > 10
                                    ? `Còn ${filteredNotifications.length - 10} thông báo khác`
                                    : "Xem tất cả lịch sử cảnh báo"
                                }
                            </p>
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
}
