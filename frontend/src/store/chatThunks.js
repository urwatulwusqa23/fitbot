// src/store/chatThunks.js
import { addMessage, setLoading, setError, selectActiveMessages } from "./chatSlice";
import { api } from "../services/api";

/**
 * Sends a user message to the AI backend, dispatches both the user message
 * and the bot reply into the ACTIVE session.
 * Shared by ChatBot.js and EChat.js.
 */
export const sendMessage = (inputText) => async (dispatch, getState) => {
  if (!inputText.trim()) return;

  const userMessage = {
    id: `user-${Date.now()}`,
    text: inputText.trim(),
    sender: "user",
    timestamp: new Date().toISOString(),
  };

  dispatch(addMessage(userMessage));
  dispatch(setLoading(true));
  dispatch(setError(null));

  try {
    const state = getState();
    const { userProfile } = state.chat;

    // Pull the last 10 messages from the active session for context
    const activeMessages = selectActiveMessages(state);
    const history = activeMessages.slice(-10).map((m) => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.text,
    }));

    const response = await api.sendChatMessage({
      message: inputText.trim(),
      history,
      userProfile,
    });

    const botMessage = {
      id: `bot-${Date.now()}`,
      text: response.reply,
      sender: "bot",
      timestamp: new Date().toISOString(),
      source: response.source || "ai",
      videos: response.videos || null,
      videoMessage: response.videoMessage || null,
    };

    dispatch(addMessage(botMessage));
  } catch (err) {
    dispatch(
      addMessage({
        id: `err-${Date.now()}`,
        text: "Sorry, I couldn't process that request. Please check the server connection and try again.",
        sender: "bot",
        timestamp: new Date().toISOString(),
        isError: true,
      })
    );
    dispatch(setError(err.message));
  } finally {
    dispatch(setLoading(false));
  }
};