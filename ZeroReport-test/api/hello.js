export default function handler(req, res) {
  res.status(200).json({
    message: "Yo King 👑, your serverless backend is alive!",
    time: new Date().toLocaleString(),
  });
}