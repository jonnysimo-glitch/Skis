/**
 * The people you ski with, on the home screen.
 *
 * Sharing is per person and off until you turn it on. The number is the
 * identity — see lib/friends.js — so a name is only a label you will
 * recognise on a chairlift.
 *
 * The banner is not a disclaimer. There is no server yet, so a friend you have
 * switched on cannot actually see you, and someone who believes their group
 * can find them on a mountain and is wrong is in more trouble than someone who
 * knows they are on their own. It says so before the list, not after it.
 */
import { Info, Locate, Plus, Trash } from "../ui/Icons.jsx";
import { formatPhone } from "../lib/friends.js";

export default function FriendsSection({ profile, friends, onAdd, onToggle, onRemove, onSetUp }) {
  return (
    <div className="sectionrule">
      <div className="rowhead">
        <div className="eyebrow">Skiing with</div>
        <button className="btn btn--quiet btn--sm" onClick={onAdd}>
          <Plus width="15" height="15" /> Add someone
        </button>
      </div>

      <div className="banner banner--warn" style={{ marginBottom: "var(--s-3)" }}>
        <Info width="18" height="18" style={{ flex: "none" }} />
        <p>
          Saved on this phone. Sharing is not connected yet, so nobody you
          switch on can see you.
        </p>
      </div>

      {!profile && friends.length > 0 && (
        <button className="promptrow" onClick={onSetUp}>
          <Locate width="17" height="17" style={{ flex: "none" }} />
          <span>
            <b>Add your own name and number</b>
            <span>Friends see your name and number when you share with them.</span>
          </span>
        </button>
      )}

      {friends.length === 0 ? (
        <div className="blank blank--tight">
          <p className="blank__t">Nobody yet</p>
          <p className="blank__s">
            Add the people you are skiing with by phone number, then switch on
            sharing for each of them.
          </p>
        </div>
      ) : (
        <ul className="rows rows--friends">
          {friends.map((f) => (
            <li className="friend" key={f.phone}>
              <span className="friend__who">
                <span className="friend__nm">{f.name}</span>
                <span className="friend__no">{formatPhone(f)}</span>
              </span>
              <button
                className="chip chip--sm"
                aria-pressed={f.sharing}
                disabled={!profile && !f.sharing}
                onClick={() => onToggle(f)}
              >
                {f.sharing ? "Sharing" : "Share"}
              </button>
              <button
                className="friend__x"
                onClick={() => onRemove(f)}
                aria-label={`Remove ${f.name}`}
              >
                <Trash width="16" height="16" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
