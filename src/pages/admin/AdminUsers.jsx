import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { toast } from "react-hot-toast";
import Layout from "../../components/Layout";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { FiUsers, FiUserPlus, FiEdit2, FiKey, FiTrash2, FiCamera, FiX, FiCheck } from "react-icons/fi";

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userCameras, setUserCameras] = useState([]);
    const [adminCameras, setAdminCameras] = useState([]);
    const [selectedCameras, setSelectedCameras] = useState([]);
    const API_BASE_URL = import.meta.env.VITE_API_URL;

    // 🔹 Lấy danh sách user
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, "users"));
            const list = [];
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                if (data.role === "user") list.push({ id: docSnap.id, ...data });
            });
            setUsers(list);
        } catch {
            toast.error("Lỗi tải danh sách nhân viên.");
        }
        setLoading(false);
    };

    // 🔹 Lấy danh sách camera admin
    const fetchAdminCameras = async () => {
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/cameras`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setAdminCameras(data || []);
        } catch {
            toast.error("Không tải được danh sách camera admin!");
        }
    };

    // 🔹 Lấy camera nhân viên
    const fetchUserCameras = async (uid) => {
        try {
            const querySnapshot = await getDocs(collection(db, "users", uid, "cameras"));
            const list = querySnapshot.docs.map((d) => {
                const data = d.data();
                // Merge với adminCameras để lấy thông tin chi tiết
                const cameraDetail = adminCameras.find((ac) => ac.id === d.id || ac.id === data.refId);
                return {
                    id: d.id,
                    ...data,
                    // Override với thông tin từ adminCameras nếu có
                    ...(cameraDetail ? {
                        cameraName: cameraDetail.cameraName,
                        location: cameraDetail.location,
                        streamUrl: cameraDetail.streamUrl,
                        status: cameraDetail.status,
                    } : {})
                };
            });
            setUserCameras(list);
        } catch {
            toast.error("Không tải được camera nhân viên!");
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchAdminCameras();
    }, []);

    // ✅ Thêm nhân viên (Swal2 form)
    const handleCreateUser = async () => {
        const { value: formValues } = await Swal.fire({
            title: "Tạo tài khoản nhân viên mới",
            html: `
                <input id="swal-name" class="swal2-input" placeholder="Tên nhân viên">
                <input id="swal-email" class="swal2-input" type="email" placeholder="Email">
                <input id="swal-password" class="swal2-input" type="password" placeholder="Mật khẩu">
            `,
            confirmButtonText: "Tạo",
            cancelButtonText: "Hủy",
            showCancelButton: true,
            preConfirm: () => {
                const name = document.getElementById("swal-name").value.trim();
                const email = document.getElementById("swal-email").value.trim();
                const password = document.getElementById("swal-password").value.trim();
                if (!name || !email || !password) {
                    Swal.showValidationMessage("Vui lòng nhập đầy đủ thông tin!");
                    return false;
                }
                return { name, email, password };
            },
        });

        if (!formValues) return;
        setLoading(true);
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/admin/create-user`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(formValues),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Tạo tài khoản nhân viên thành công!");
                fetchUsers();
            } else toast.error(data.error || "Lỗi tạo tài khoản!");
        } catch {
            toast.error("Không thể kết nối server!");
        }
        setLoading(false);
    };

    // ✅ Sửa thông tin nhân viên (Swal2 form)
    const handleEditUser = async (user) => {
        const { value: formValues } = await Swal.fire({
            title: "Chỉnh sửa thông tin nhân viên",
            html: `
                <input id="swal-name" class="swal2-input" value="${user.name || ""}" placeholder="Tên nhân viên">
                <input id="swal-email" class="swal2-input" type="email" value="${user.email || ""}" placeholder="Email">
            `,
            confirmButtonText: "Lưu thay đổi",
            cancelButtonText: "Hủy",
            showCancelButton: true,
            preConfirm: () => {
                const name = document.getElementById("swal-name").value.trim();
                const email = document.getElementById("swal-email").value.trim();
                if (!name || !email) {
                    Swal.showValidationMessage("Vui lòng nhập đầy đủ thông tin!");
                    return false;
                }
                return { name, email };
            },
        });

        if (!formValues) return;

        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/admin/update-user/${user.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(formValues),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Cập nhật thành công!");
                fetchUsers();
            } else toast.error(data.error || "Lỗi cập nhật!");
        } catch {
            toast.error("Không thể kết nối server!");
        }
    };

    // ✅ Reset mật khẩu
    const handleResetPassword = async (uid) => {
        const { value: newPassword } = await Swal.fire({
            title: "Đặt lại mật khẩu",
            input: "password",
            inputLabel: "Nhập mật khẩu mới cho nhân viên",
            inputPlaceholder: "Nhập mật khẩu mới...",
            confirmButtonText: "Xác nhận",
            cancelButtonText: "Hủy",
            showCancelButton: true,
            inputValidator: (value) => (!value ? "Mật khẩu không được để trống!" : undefined),
        });

        if (!newPassword) return;

        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/admin/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ uid, newPassword }),
            });
            const data = await res.json();
            if (data.success) toast.success("Đặt lại mật khẩu thành công!");
            else toast.error(data.error || "Lỗi reset mật khẩu!");
        } catch {
            toast.error("Không thể kết nối server!");
        }
    };

    // ✅ Xóa nhân viên
    const handleDeleteUser = async (uid) => {
        const confirm = await Swal.fire({
            title: "Xóa nhân viên này?",
            text: "Hành động này không thể hoàn tác!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Xóa",
            cancelButtonText: "Hủy",
            confirmButtonColor: "#d33",
        });

        if (!confirm.isConfirmed) return;

        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/admin/delete-user/${uid}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Đã xóa nhân viên!");
                fetchUsers();
                if (selectedUser?.id === uid) setSelectedUser(null);
            } else toast.error(data.error || "Lỗi khi xóa!");
        } catch {
            toast.error("Không thể kết nối server!");
        }
    };

    // ✅ Cấp nhiều camera (bản sao)
    const handleAssignCameras = async () => {
        if (!selectedUser || selectedCameras.length === 0) {
            toast.error("Chưa chọn camera nào để cấp!");
            return;
        }
        try {
            const owned = userCameras.map((c) => c.id);
            const newCams = selectedCameras.filter((id) => !owned.includes(id));
            if (newCams.length === 0) {
                toast.error("Camera này đã được cấp!");
                return;
            }

            for (const id of newCams) {
                const cam = adminCameras.find((c) => c.id === id);
                await setDoc(doc(db, "users", selectedUser.id, "cameras", id), {
                    refId: cam.id,
                    cameraName: cam.cameraName,
                    location: cam.location,
                    status: cam.status,
                    streamUrl: cam.streamUrl,
                    createdAt: cam.createdAt,
                    updatedAt: cam.updatedAt,
                    assignedAt: new Date().toISOString(),
                });
            }

            toast.success(`Đã cấp ${newCams.length} camera cho ${selectedUser.name}`);
            fetchUserCameras(selectedUser.id);
            setSelectedCameras([]);
        } catch {
            toast.error("Lỗi khi cấp camera!");
        }
    };

    // ✅ Thu hồi camera
    const handleRevokeCamera = async (camId) => {
        try {
            await deleteDoc(doc(db, "users", selectedUser.id, "cameras", camId));
            toast.success("Đã thu hồi camera!");
            fetchUserCameras(selectedUser.id);
        } catch {
            toast.error("Không thể thu hồi camera!");
        }
    };

    // 🔹 Khi click user
    const handleSelectUser = async (user) => {
        setSelectedUser(user);
        await fetchUserCameras(user.id);
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <FiUsers size={32} className="text-blue-400" />
                        Quản lý Nhân viên
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Quản lý tài khoản và phân quyền camera cho nhân viên
                    </p>
                </div>

                <div className={`transition-all duration-300 ${selectedUser ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : ""}`}>
                    {/* Danh sách nhân viên */}
                    <div className={`bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden ${selectedUser ? "" : "col-span-2"}`}>
                        {/* Table Header */}
                        <div className="bg-[#252525] px-6 py-4 border-b border-[#333333] flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <FiUsers size={20} className="text-blue-400" />
                                Danh sách nhân viên ({users.length})
                            </h2>
                            <button
                                onClick={handleCreateUser}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                            >
                                <FiUserPlus size={18} />
                                Tạo nhân viên
                            </button>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-[#252525] border-b border-[#333333]">
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Tên</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Email</th>
                                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-400">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#2a2a2a]">
                                    {users.map((u) => (
                                        <tr
                                            key={u.id}
                                            className={`group hover:bg-[#252525] cursor-pointer transition ${selectedUser?.id === u.id ? "bg-blue-500/20" : ""}`}
                                        >
                                            <td onClick={() => handleSelectUser(u)} className="px-6 py-4 text-white font-medium">
                                                {u.name}
                                            </td>
                                            <td onClick={() => handleSelectUser(u)} className="px-6 py-4 text-gray-400">
                                                {u.email}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => handleEditUser(u)} className="p-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition" title="Sửa">
                                                        <FiEdit2 size={16} />
                                                    </button>
                                                    <button onClick={() => handleResetPassword(u.id)} className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition" title="Reset mật khẩu">
                                                        <FiKey size={16} />
                                                    </button>
                                                    <button onClick={() => handleDeleteUser(u.id)} className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition" title="Xóa">
                                                        <FiTrash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {users.length === 0 && !loading && (
                                <div className="py-12 text-center text-gray-500">
                                    <FiUsers size={48} className="mx-auto mb-3 opacity-30" />
                                    <p>Chưa có nhân viên nào</p>
                                </div>
                            )}

                            {loading && (
                                <div className="py-12 text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500 mx-auto"></div>
                                    <p className="text-gray-500 mt-3">Đang tải...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chi tiết user */}
                    {selectedUser && (
                        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden animate-fadeIn">
                            {/* Header */}
                            <div className="bg-blue-500/20 px-6 py-5 border-b border-blue-500/30">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold text-white mb-1">{selectedUser.name}</h2>
                                        <p className="text-gray-400 text-sm">{selectedUser.email}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedUser(null)}
                                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition text-gray-400 hover:text-white"
                                    >
                                        <FiX size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Camera đang sở hữu */}
                                <div>
                                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-gray-800">
                                        <FiCamera size={20} className="text-purple-600" />
                                        Camera đang sở hữu
                                    </h3>
                                    {userCameras.length > 0 ? (
                                        <div className="space-y-2">
                                            {userCameras.map((cam) => (
                                                <div
                                                    key={cam.id}
                                                    className="flex justify-between items-center bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 rounded-xl border border-purple-200"
                                                >
                                                    <span className="font-medium text-gray-800">
                                                        📹 {cam.cameraName || cam.id}
                                                    </span>
                                                    <button
                                                        onClick={() => handleRevokeCamera(cam.id)}
                                                        className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium hover:underline transition-colors"
                                                    >
                                                        <FiX size={16} />
                                                        Thu hồi
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 rounded-xl px-4 py-6 text-center text-gray-500">
                                            <FiCamera size={32} className="mx-auto mb-2 opacity-30" />
                                            <p className="text-sm">Chưa có camera nào</p>
                                        </div>
                                    )}
                                </div>

                                {/* Cấp thêm camera */}
                                <div>
                                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-gray-800">
                                        <FiCheck size={20} className="text-green-600" />
                                        Cấp thêm camera
                                    </h3>
                                    <div className="max-h-64 overflow-y-auto border-2 border-gray-200 rounded-xl p-3 bg-gray-50 space-y-2">
                                        {adminCameras.map((cam) => {
                                            const owned = userCameras.some((c) => c.id === cam.id);
                                            const isInactive = cam.status === "inactive";
                                            const isDisabled = owned || isInactive;

                                            return (
                                                <label
                                                    key={cam.id}
                                                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isDisabled
                                                        ? "opacity-40 cursor-not-allowed bg-gray-100"
                                                        : "cursor-pointer hover:bg-white hover:shadow-md bg-white/50"
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        disabled={isDisabled}
                                                        value={cam.id}
                                                        checked={selectedCameras.includes(cam.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked)
                                                                setSelectedCameras([...selectedCameras, cam.id]);
                                                            else
                                                                setSelectedCameras(
                                                                    selectedCameras.filter((id) => id !== cam.id)
                                                                );
                                                        }}
                                                        className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                                                    />
                                                    <span className="font-medium text-gray-700">
                                                        {cam.cameraName || cam.id}
                                                    </span>
                                                    {owned && (
                                                        <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                                            Đã sở hữu
                                                        </span>
                                                    )}
                                                    {isInactive && !owned && (
                                                        <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                                            Không hoạt động
                                                        </span>
                                                    )}
                                                </label>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={handleAssignCameras}
                                        disabled={selectedCameras.length === 0}
                                        className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-xl transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <FiCheck size={20} />
                                        Cấp camera ({selectedCameras.length})
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
