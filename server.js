
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = 8787;
const ROOT = __dirname;
const UPLOADS = path.join(ROOT, "uploads");
const DB = path.join(ROOT, "videos.json");

fs.mkdirSync(UPLOADS, { recursive: true });

if (!fs.existsSync(DB)) {
  fs.writeFileSync(DB, "[]", "utf8");
}

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(UPLOADS));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomUUID() + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("영상 파일만 업로드할 수 있습니다."));
    }
  }
});


app.get("/", (_req, res) => {
  res.sendFile(path.join(ROOT, "baeum_study_shorts_prototype (1).html"));
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/videos", (_req, res) => {
  const videos = JSON.parse(fs.readFileSync(DB, "utf8"));
  res.json({ videos });
});

app.post("/api/videos", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "영상 파일이 필요합니다." });
  }

  const title = (req.body.title || "").trim();

  if (!title) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "영상 제목을 입력해 주세요." });
  }

  const video = {
    id: crypto.randomUUID(),
    title,
    subject: req.body.subject || "상식",
    description: req.body.description || "",
    filename: req.file.filename,
    url: "/uploads/" + req.file.filename,
    createdAt: new Date().toISOString()
  };

  const videos = JSON.parse(fs.readFileSync(DB, "utf8"));
  videos.unshift(video);
  fs.writeFileSync(DB, JSON.stringify(videos, null, 2), "utf8");

  res.status(201).json({ video });
});

app.use((err, _req, res, _next) => {
  res.status(400).json({
    error: err.code === "LIMIT_FILE_SIZE"
      ? "영상 크기는 200MB 이하여야 합니다."
      : err.message || "업로드 중 오류가 발생했습니다."
  });
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`배움 서버 실행 중: http://127.0.0.1:${PORT}`);
});
