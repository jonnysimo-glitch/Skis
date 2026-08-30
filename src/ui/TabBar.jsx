/**
 * The three places this app has.
 *
 * Home is where you decide where you are skiing and see what you have done.
 * Skiing is the mountain: planning, choosing and navigating all happen over
 * the map, because they are the same activity at different moments. Stats is
 * the record.
 *
 * Settings is deliberately not here. It is somewhere you go once, so it does
 * not deserve a quarter of the most valuable strip of screen on the phone.
 */
import { HomeIcon, Mountain, Chart } from "./Icons.jsx";

export const TABS = [
  { id: "home", label: "Home", Icon: HomeIcon },
  { id: "skiing", label: "Skiing", Icon: Mountain },
  { id: "stats", label: "Stats", Icon: Chart },
];

export default function TabBar({ tab, onChange, hidden }) {
  return (
    <nav className={`tabbar${hidden ? " tabbar--hidden" : ""}`} aria-label="Sections">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className="tabbar__tab"
          aria-current={tab === id ? "page" : undefined}
          onClick={() => onChange(id)}
        >
          <Icon width="24" height="24" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
