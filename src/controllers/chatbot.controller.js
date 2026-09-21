// ============================================================
// CHATBOT CONTROLLER
// ============================================================

async function chat(req, res) {
  const {
    message
  } = req.body;

  if (!message || !String(message).trim()) {
    return res.status(400).json({
      message: "Message is required"
    });
  }

  const cleanMessage = String(message).trim();

  // Basic response for now.
  // The controller can later be connected to an AI service
  // without changing the route structure.

  return res.json({
    success: true,
    message: "Chatbot response generated",
    reply: `You said: ${cleanMessage}`,
    user: req.user
      ? {
          id: req.user.id,
          role: req.user.role
        }
      : null
  });
}

module.exports = {
  chat
};