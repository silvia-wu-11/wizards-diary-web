<!-- 本文件是给Figma make初始设计前端界面使用的 -->
# Project Guidelines: Magical Diary Web App

## 🎯 Project Overview
**Goal:** Build a web-based diary application that immerses users in a magical, Harry Potter-inspired atmosphere. 

## 🎨 Visual Design Language (UI)
**General Vibe:** Warm, magical, and inviting. The interface should feature a watercolor cartoon style with soft brush strokes, semi-transparent layers, and hand-drawn textures.
- **Shapes & Shadows:** Use rounded corners and soft, diffused drop shadows for all UI elements.
- **Materials & Textures:**
    - Aged parchment (with slight wrinkles and weathering)
    - Vintage leather
    - Metal clasps and hardware
    - Magical glowing effects
- **Embellishments:** Decorate the UI with Harry Potter IP-inspired magical elements (e.g., wands, stars, potions).

## 🔤 Typography
- **Headings / Titles:** Magical-style display font (e.g., *Harry P* or similar).
- **English Body Text:** Vintage Serif font to simulate an elegant, handwritten feel.
- **Chinese Body Text:** Songti (宋体) to maintain a classic, literary aesthetic.

## 🕹️ Interaction & Motion (UX)
**Core Animation Principles:** Focus on immersive, spell-like interactions.
- **Page Load:** Magical light fade-in effect.
- **Buttons:** Magical visual feedback (e.g., sparks or glowing borders) upon click/tap.
- **Cards (Hover State):** Slight floating elevation accompanied by a subtle magical halo/glow.
- **Scrolling:** Smooth scrolling transition simulating a physical parchment page turning.

## 💬 System Feedback & States
- **Success State:** Magical light burst or sparkle effect indicating a successful save.
- **Error State:** Thematic magical error prompt (e.g., a fizzling spell or dark smoke) for failed actions.
- **Loading State:** Custom magical loading animation (e.g., a stirring cauldron, floating wand, or hourglass).

## 💻 Technical Constraints (Dev Handoff)
- **Architecture:** Prioritize frontend technologies. Minimize backend services and database logic as much as possible.
- **Data Storage:** Diary entries and saves should primarily utilize browser-local storage (e.g., `localStorage` or `IndexedDB`).