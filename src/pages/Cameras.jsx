import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";

export default function Cameras() {
  const { currentUser } = useAuth();
  const [cameraList, setCameraList] = useState([]);
  const [selectedCount, setSelectedCount] = useState(1);
  const [selectedCameras, setSelectedCameras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const fetchCameras = async () => {
      try {
        setLoading(true);
        const token = await currentUser.getIdToken(true);

        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/cameras`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Không thể tải danh sách camera");

        const data = await res.json();
        // Chỉ lấy camera có status active
        const activeCameras = data.filter((cam) => cam.status === "active");
        setCameraList(activeCameras);

        if (activeCameras.length > 0) setSelectedCameras([activeCameras[0]]);
      } catch (err) {
        console.error("Lỗi tải camera:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCameras();
  }, [currentUser]);

  const handleSelectLayout = (count) => {
    setSelectedCount(count);
    setSelectedCameras(cameraList.slice(0, count));
  };

  const handleSelectCamera = (cam) => {
    if (selectedCameras.find((c) => c.id === cam.id)) return;

    const newList = [...selectedCameras];
    if (newList.length >= selectedCount) newList.shift();
    newList.push(cam);
    setSelectedCameras(newList);
  };

  if (loading)
    return (
      <Layout>
        <div className="flex justify-center items-center h-[70vh] text-gray-400">
          Đang tải danh sách camera...
        </div>
      </Layout>
    );

  return (
    <Layout>
      <div className="flex h-[85vh] gap-6">

        {/* MAIN VIEW */}
        <div className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 flex flex-col">

          <div className="flex justify-end gap-3 mb-4">
            {[1, 4, 9].map((n) => (
              <button
                key={n}
                onClick={() => handleSelectLayout(n)}
                className={`px-5 py-2.5 rounded-lg font-semibold transition-all duration-300 ${selectedCount === n
                  ? "bg-blue-600 text-white"
                  : "bg-[#252525] border border-[#333333] text-gray-300 hover:bg-[#2a2a2a]"
                  }`}
              >
                <span className="text-lg">{n === 1 ? "1️⃣" : n === 4 ? "2️⃣×2️⃣" : "3️⃣×3️⃣"}</span>
              </button>
            ))}
          </div>

          <div
            className={`grid gap-4 flex-1 ${selectedCount === 1
              ? "grid-cols-1"
              : selectedCount === 4
                ? "grid-cols-2"
                : "grid-cols-3"
              }`}
          >
            {selectedCameras.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-gray-500">
                <svg className="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-lg font-medium">Chưa chọn camera nào</p>
              </div>
            ) : (
              selectedCameras.map((cam) => (
                <CameraView key={cam.id} cam={cam} />
              ))
            )}
          </div>
        </div>

        {/* SIDE LIST */}
        <aside className="w-72 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 overflow-y-auto">
          <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
            📷 Danh sách Camera
          </h2>

          {cameraList.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Chưa có camera nào.</p>
          ) : (
            <ul className="space-y-3">
              {cameraList.map((cam) => (
                <li
                  key={cam.id}
                  onClick={() => handleSelectCamera(cam)}
                  className={`cursor-pointer rounded-lg p-4 transition-all duration-300 ${selectedCameras.find((c) => c.id === cam.id)
                    ? "bg-blue-600 text-white border border-blue-500"
                    : "bg-[#252525] border border-[#333333] hover:bg-[#2a2a2a] text-gray-300"
                    }`}
                >
                  <div
                    className={`font-semibold ${selectedCameras.find((c) => c.id === cam.id)
                      ? "text-white"
                      : "text-gray-200"
                      }`}
                  >
                    {cam.cameraName}
                  </div>
                  <div
                    className={`text-sm mt-1 ${selectedCameras.find((c) => c.id === cam.id)
                      ? "text-blue-200"
                      : "text-gray-500"
                      }`}
                  >
                    📍 {cam.location}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </Layout>
  );
}

/* ==============================
   CAMERA VIEW (MJPEG STREAM)
============================== */

function CameraView({ cam }) {
  const { currentUser } = useAuth();
  const [streamUrl, setStreamUrl] = useState("");

  useEffect(() => {
    let active = true;

    const loadUrl = async () => {
      try {
        const token = await currentUser.getIdToken(true);

        const url = `${import.meta.env.VITE_API_URL}/api/stream/${cam.id}?token=${token}`;

        if (active) setStreamUrl(url);
      } catch (err) {
        console.error("Lỗi load token:", err);
      }
    };

    loadUrl();

    return () => {
      active = false;
    };
  }, [cam.id, currentUser]);

  return (
    <div className="relative bg-black rounded-lg overflow-hidden shadow-lg">
      {streamUrl ? (
        <img
          src={streamUrl}
          className="w-full h-full object-cover"
          alt="camera-stream"
        />
      ) : (
        <div className="flex justify-center items-center h-full text-white">
          Đang tải stream...
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 text-center">
        <div className="font-semibold">{cam.cameraName}</div>
        <div>{cam.location}</div>
      </div>
    </div>
  );
}
