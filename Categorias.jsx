* { box-sizing: border-box; }

:root {
  --green: #166534;
  --green-2: #15803d;
  --dark: #172018;
  --muted: #6b7280;
  --bg: #f7f3ea;
  --card: #ffffff;
  --line: #e7dfd2;
  --danger: #b91c1c;
}

body {
  margin: 0;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--dark);
}

button, input, select { font: inherit; }
button { cursor: pointer; }

.loading {
  min-height: 100vh;
  display: grid;
  place-items: center;
  color: var(--green);
  font-weight: 900;
}

.login-screen {
  min-height: 100vh;
  padding: 22px;
  max-width: 480px;
  margin: 0 auto;
  display: grid;
  align-content: center;
  gap: 18px;
}

.brand-card {
  background: linear-gradient(150deg, #14532d, #15803d);
  color: #fff;
  padding: 28px;
  border-radius: 28px;
  box-shadow: 0 16px 40px rgba(20, 83, 45, 0.25);
}

.logo-mark {
  width: 58px;
  height: 58px;
  border-radius: 20px;
  background: rgba(255,255,255,0.14);
  display: grid;
  place-items: center;
  margin-bottom: 18px;
  overflow: hidden;
}

.logo-mark img {
  width: 58px;
  height: 58px;
  display: block;
}

.brand-card h1 { margin: 0; font-size: 36px; }
.brand-card p { margin: 8px 0 0; color: rgba(255,255,255,0.82); }

.app-shell {
  min-height: 100vh;
  max-width: 520px;
  margin: 0 auto;
  padding: 18px 16px 100px;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  padding: 12px 0 16px;
  background: linear-gradient(var(--bg) 78%, rgba(247, 243, 234, 0));
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.eyebrow {
  margin: 0;
  color: var(--green);
  font-weight: 900;
  letter-spacing: .04em;
  text-transform: uppercase;
  font-size: 12px;
}

.topbar h1 { margin: 2px 0 0; font-size: 25px; }

.header-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-brand img {
  width: 44px;
  height: 44px;
  border-radius: 15px;
  box-shadow: 0 6px 18px rgba(22,101,52,.18);
}


.icon-btn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 6px 20px rgba(0,0,0,.06);
  color: var(--green);
}

.page h2 { margin: 8px 0 10px; font-size: 28px; }
.muted { color: var(--muted); margin-top: -4px; }

.hero {
  padding: 24px;
  border-radius: 28px;
  background: #172018;
  color: #fff;
  margin-bottom: 16px;
  box-shadow: 0 14px 34px rgba(23,32,24,.18);
}

.hero p { margin: 0; color: #d1d5db; }
.hero h2 { margin: 8px 0; font-size: 38px; }
.hero span { color: #bbf7d0; font-weight: 800; }

.action-card {
  width: 100%;
  border: none;
  border-radius: 24px;
  padding: 22px;
  text-align: left;
  display: grid;
  gap: 4px;
  margin-bottom: 16px;
  color: #fff;
}

.action-card strong { font-size: 24px; }
.action-card span, .action-card small { opacity: .9; }
.success { background: linear-gradient(135deg, #15803d, #22c55e); }
.danger { background: linear-gradient(135deg, #b91c1c, #f97316); }

.stats-grid, .result-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 9px;
}

.stat, .result-grid div {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 14px;
}

.stat small, .result-grid small { display: block; color: var(--muted); font-size: 12px; }
.stat strong { display: block; margin-top: 5px; font-size: 22px; }

.section { margin-top: 20px; }
.quick-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 9px; }

.quick-grid button {
  min-height: 76px;
  border: none;
  border-radius: 18px;
  background: #fff;
  font-weight: 900;
  color: var(--green);
}

.form-card {
  background: #fff;
  border: 1px solid var(--line);
  padding: 20px;
  border-radius: 24px;
  display: grid;
  gap: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,.05);
}

.form-card.compact { margin-bottom: 14px; }
.form-card h2, .form-card h3 { margin: 0 0 6px; }

label {
  font-size: 13px;
  font-weight: 900;
  color: #374151;
}

input, select {
  width: 100%;
  border: 1px solid #d8d0c3;
  border-radius: 15px;
  padding: 13px 14px;
  background: #fffdfa;
  outline: none;
}

input:focus, select:focus { border-color: var(--green); }

.row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

.primary-btn, .secondary-btn {
  width: 100%;
  border: none;
  border-radius: 17px;
  padding: 15px 18px;
  font-weight: 900;
}

.primary-btn {
  background: var(--green);
  color: #fff;
  box-shadow: 0 10px 22px rgba(22,101,52,.18);
}

.secondary-btn {
  border: 1px solid var(--line);
  background: #fff7ed;
  color: var(--green);
}

.message {
  margin: 4px 0;
  padding: 12px;
  border-radius: 14px;
  background: #fef3c7;
  color: #92400e;
  font-size: 14px;
}

.access-note {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 13px;
  text-align: center;
  line-height: 1.4;
}

.list { display: grid; gap: 10px; }

.item-card, .history-card, .close-card, .history-group, .selected-fair-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 22px;
  padding: 16px;
  box-shadow: 0 7px 18px rgba(0,0,0,.04);
}

.item-card {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.item-card div { display: grid; gap: 3px; }
.item-card strong, .history-card strong, .close-card strong { font-size: 17px; }
.item-card span, .history-card span, .close-card span { color: var(--muted); font-size: 14px; }
.item-card small { color: var(--green); font-weight: 800; }

.input-card { align-items: stretch; }
.input-card input { max-width: 105px; }

.mini-btn { border: none; background: transparent; font-weight: 900; }
.danger-text { color: var(--danger); }

.fair-place-card { align-items: stretch; }
.fair-start {
  flex: 1;
  border: none;
  background: transparent;
  text-align: left;
  display: grid;
  gap: 4px;
  padding: 0;
  color: inherit;
}

.fair-start small { color: var(--green); font-weight: 900; }

.selected-fair-card {
  background: #dcfce7;
  border-color: #bbf7d0;
  display: grid;
  gap: 4px;
  margin-bottom: 14px;
}

.selected-fair-card strong { color: var(--green); font-size: 20px; }
.selected-fair-card span { color: #166534; }

.close-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 12px;
  gap: 12px;
}

.history-group {
  margin-bottom: 14px;
  display: grid;
  gap: 12px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 12px;
}

.group-header h3 { margin: 0; color: var(--green); }
.group-header span, .history-group small { color: var(--muted); }

.history-card { display: grid; gap: 14px; }
.history-card > div:first-child {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

details { color: var(--muted); }
summary { color: var(--green); font-weight: 900; cursor: pointer; }

.empty {
  text-align: center;
  color: var(--muted);
  padding: 32px 12px;
}

.sticky-btn {
  position: sticky;
  bottom: 88px;
  margin-top: 16px;
}

.bottom-nav {
  position: fixed;
  z-index: 10;
  left: 50%;
  transform: translateX(-50%);
  bottom: 14px;
  width: min(94vw, 500px);
  background: rgba(255,255,255,.94);
  border: 1px solid var(--line);
  box-shadow: 0 14px 38px rgba(0,0,0,.14);
  border-radius: 26px;
  padding: 8px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  backdrop-filter: blur(12px);
}

.nav-item {
  border: none;
  border-radius: 18px;
  background: transparent;
  color: #6b7280;
  min-height: 58px;
  display: grid;
  place-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 900;
}

.nav-item.active {
  background: #dcfce7;
  color: var(--green);
}

@media (min-width: 700px) {
  body { background: #eee6d8; }
  .app-shell { background: var(--bg); min-height: 100vh; }
}
