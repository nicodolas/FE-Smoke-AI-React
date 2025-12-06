import Layout from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
    FiCamera,
    FiBell,
    FiDatabase,
    FiSettings,
    FiUsers,
    FiVideo,
} from "react-icons/fi";
import { Toaster } from "react-hot-toast";
import { useNotifications } from "../contexts/NotificationContext";

export default function Dashboard() {
    const { role } = useAuth();
    const { unreadCount } = useNotifications();
    const navigate = useNavigate();

    const baseFeatures = [
        {
            icon: <FiCamera size={32} />,
            label: "Xem Camera",
            path: "/cameras",
            description: "Theo dõi camera trực tiếp"
        },
        {
            icon: (
                <div className="relative flex items-center justify-center">
                    <FiBell size={32} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </div>
            ),
            label: "Thông báo",
            path: "/notifications",
            description: "Xem các thông báo mới"
        },
        {
            icon: <FiDatabase size={32} />,
            label: "Nhật ký",
            path: "/alert",
            description: "Lịch sử phát hiện cháy/khói"
        },
        {
            icon: <FiSettings size={32} />,
            label: "Cài đặt",
            path: "/settings",
            description: "Tùy chỉnh hệ thống"
        },
    ];

    const adminFeatures = [
        {
            icon: <FiUsers size={32} />,
            label: "Quản lý Users",
            path: "/admin/users",
            description: "Quản lý người dùng"
        },
        {
            icon: <FiVideo size={32} />,
            label: "Quản lý Cameras",
            path: "/admin/cameras",
            description: "Quản lý camera trong hệ thống"
        },
    ];

    const features =
        role === "admin" ? [...baseFeatures, ...adminFeatures] : baseFeatures;

    const handleFeatureClick = (f) => {
        if (
            ["Quản lý Users", "Quản lý Cameras"].includes(f.label) &&
            role !== "admin"
        ) {
            alert("Bạn không có quyền truy cập chức năng này.");
            return;
        }
        navigate(f.path);
    };

    return (
        <Layout>
            <Toaster position="top-right" />

            <div className="relative z-10">
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-2xl font-semibold text-white mb-2">
                        Dashboard
                    </h1>
                    <p className="text-gray-500">
                        Hệ thống giám sát phát hiện cháy & khói
                    </p>
                </div>

                {/* Feature Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
                    {features.map((f, i) => (
                        <button
                            key={i}
                            onClick={() => handleFeatureClick(f)}
                            className="group text-left"
                        >
                            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 hover:border-blue-500/50 hover:bg-[#1e1e1e] transition-all duration-200">
                                <div className="flex items-center gap-4">
                                    {/* Icon */}
                                    <div className="w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                                        {f.icon}
                                    </div>
                                    {/* Text */}
                                    <div>
                                        <h3 className="text-base font-semibold text-white mb-0.5">
                                            {f.label}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {f.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

            </div>
        </Layout>
    );
}
