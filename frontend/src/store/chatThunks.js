import { addMessage, setLoading, setError, selectActiveMessages } from "./chatSlice";
import { api } from "../services/api";

// ── Detect plan type from bot reply ──────────────────────────────────────────
const detectPlanType = (text) => {
    const lower = text.toLowerCase();
    const isDiet = lower.includes("calorie") || lower.includes("breakfast") ||
        lower.includes("lunch") || lower.includes("dinner") || lower.includes("meal") ||
        lower.includes("diet") || lower.includes("nutrition") || lower.includes("protein");
    const isExercise = lower.includes("sets") || lower.includes("reps") ||
        lower.includes("workout") || lower.includes("exercise") || lower.includes("day 1") ||
        lower.includes("push") || lower.includes("pull") || lower.includes("legs");
    if (isDiet) return "diet";
    if (isExercise) return "exercise";
    return null;
};

// ── Extract deep memory facts from conversation ───────────────────────────────
const extractMemoryFacts = (userText, botText) => {
    const facts = [];
    const lower = userText.toLowerCase();

    // Goal detection
    if (lower.includes("lose weight") || lower.includes("weight loss"))
        facts.push({ key: "goal", value: "weight_loss", category: "fitness" });
    else if (lower.includes("gain muscle") || lower.includes("build muscle") || lower.includes("bulk"))
        facts.push({ key: "goal", value: "muscle_gain", category: "fitness" });
    else if (lower.includes("maintain"))
        facts.push({ key: "goal", value: "maintain", category: "fitness" });

    // Diet preferences
    if (lower.includes("vegetarian"))
        facts.push({ key: "diet_type", value: "vegetarian", category: "diet" });
    else if (lower.includes("vegan"))
        facts.push({ key: "diet_type", value: "vegan", category: "diet" });
    else if (lower.includes("keto"))
        facts.push({ key: "diet_type", value: "keto", category: "diet" });

    // Injuries / health
    if (lower.includes("knee pain") || lower.includes("knee injury"))
        facts.push({ key: "injury", value: "knee_pain", category: "medical" });
    if (lower.includes("back pain") || lower.includes("back injury"))
        facts.push({ key: "injury", value: "back_pain", category: "medical" });
    if (lower.includes("shoulder"))
        facts.push({ key: "injury", value: "shoulder_pain", category: "medical" });

    // Experience level
    if (lower.includes("beginner") || lower.includes("just started") || lower.includes("new to"))
        facts.push({ key: "experience", value: "beginner", category: "fitness" });
    else if (lower.includes("intermediate"))
        facts.push({ key: "experience", value: "intermediate", category: "fitness" });
    else if (lower.includes("advanced") || lower.includes("years of"))
        facts.push({ key: "experience", value: "advanced", category: "fitness" });

    // Workout frequency preference
    const daysMatch = lower.match(/(\d)\s*days?\s*(a|per)\s*week/);
    if (daysMatch)
        facts.push({ key: "workout_days", value: daysMatch[1], category: "fitness" });

    return facts;
};

// ── Main thunk ────────────────────────────────────────────────────────────────
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

        // Detect plan type from the bot's reply
        const planType = response.planType || detectPlanType(response.reply || "");

        const botMessage = {
            id: `bot-${Date.now()}`,
            text: response.reply,
            sender: "bot",
            timestamp: new Date().toISOString(),
            source: response.source || "ai",
            videos: response.videos || null,
            videoMessage: response.videoMessage || null,
            planType: planType,           // "diet" | "exercise" | null
            planText: response.reply,     // full text to save as JSON
        };

        dispatch(addMessage(botMessage));

        // ── Save deep memory facts silently in background ─────────────────────────
        const facts = extractMemoryFacts(inputText.trim(), response.reply || "");
        if (facts.length > 0) {
            const token = localStorage.getItem("token");
            if (token) {
                api.upsertMemory(facts).catch(() => { }); // silent — don't block UI
            }
        }

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