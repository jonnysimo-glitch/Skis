/**
 * Friends and location sharing. Run with: node src/lib/friends.test.js
 *
 * The phone number is the identity, so normalising it is a correctness
 * problem, not a formatting one. Two spellings of one number that do not
 * collide give one person two records, and the sharing switch you flipped is
 * on the record nobody is reading. Most of what follows is that.
 */

// localStorage before the module under test loads: persist.js reads on import.
const store = {};
globalThis.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; },
};

const {
  normalisePhone, samePhone, formatPhone,
  getProfile, saveProfile, clearProfile,
  listFriends, addFriend, removeFriend, renameFriend,
  setSharing, sharingWith, clearFriends, MAX_NAME,
} = await import("./friends.js");
const { load, save } = await import("./persist.js");

let failures = 0;
function check(name, condition, detail = "") {
  if (!condition) failures++;
  console.log(`  ${condition ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}
const reset = () => { clearFriends(); clearProfile(); };

console.log("\nA NUMBER IS AN IDENTITY, NOT A STRING");
check("spaces and punctuation do not make a different person",
  normalisePhone("+44 7700 900-123") === normalisePhone("+447700900123"),
  `${normalisePhone("+44 7700 900-123")}`);
check("brackets do not either", samePhone("+39 (333) 123 4567", "+393331234567"));
check("00 is the same prefix as +", samePhone("00393331234567", "+393331234567"));
// The one that has to be refused rather than guessed at. 07700 900123 is a
// real number to a British reader and a different real number to an Italian
// one; without the prefix the same person has two identities.
check("a number without a country code is refused, not guessed",
  normalisePhone("07700900123") === null);
check("so is something that is not a number", normalisePhone("+notaphone") === null);
check("and something far too short", normalisePhone("+44") === null);
check("and far too long", normalisePhone("+4477009001234567890") === null);
check("and nothing at all", normalisePhone("") === null && normalisePhone(undefined) === null);
check("two different numbers are two different people", !samePhone("+393331234567", "+393331234568"));

console.log("\nHOW A NUMBER IS SHOWN");
// Regrouping needs a table of country codes we do not have: splitting from the
// right turned "+44 7700 900123" into "+447 700 900 123".
check("what they typed is what they see",
  formatPhone({ phone: "+447700900123", typed: "+44 7700 900123" }) === "+44 7700 900123");
check("and the key is shown when there is nothing else",
  formatPhone({ phone: "+393331234567" }) === "+393331234567");

console.log("\nYOUR OWN PROFILE");
reset();
check("there is nobody until you say so", getProfile() === null);
check("a number with no name is refused", saveProfile({ name: "", phone: "+393331234567" }).error === "name");
check("a name with no number is refused", saveProfile({ name: "Simo", phone: "" }).error === "phone");
check("and a local number is refused with the reason",
  /country code/.test(saveProfile({ name: "Simo", phone: "3331234567" }).message));
check("still nobody after all that", getProfile() === null);
check("name and number is enough", saveProfile({ name: "  Simo  ", phone: "+39 333 123 4567" }).ok);
check("the name is trimmed", getProfile().name === "Simo", getProfile()?.name);
check("the number is stored normalised", getProfile().phone === "+393331234567");
// Ability was in the profile long before a name was, and saving one must not
// throw the other away.
check("saving a profile keeps the ability set in it", load("profile").ability === "red",
  JSON.stringify(load("profile")));
save("profile", { ...load("profile"), ability: "black" });
saveProfile({ name: "Simo", phone: "+393331234567" });
check("and keeps it when it has been changed", load("profile").ability === "black");
clearProfile();
check("clearing the profile clears the identity", getProfile() === null);
check("but not the ability", load("profile").ability === "black", JSON.stringify(load("profile")));

console.log("\nADDING PEOPLE");
reset();
saveProfile({ name: "Simo", phone: "+393331234567" });
check("the list starts empty", listFriends().length === 0);
check("name and number is all that is asked for", addFriend({ name: "Ana", phone: "+39 333 111 2222" }).ok);
check("they are on the list", listFriends().length === 1 && listFriends()[0].name === "Ana");
check("nobody is shared with just by being added", listFriends()[0].sharing === false);
check("a friend with no name is refused", addFriend({ name: " ", phone: "+39 333 111 3333" }).error === "name");
check("a friend with a local number is refused", addFriend({ name: "Bo", phone: "3331113333" }).error === "phone");
check("neither of those got added", listFriends().length === 1, `${listFriends().length}`);
// Same person, typed differently. Without normalisation this is a second
// record, and the switch on the first one stops meaning anything.
const dup = addFriend({ name: "Ana again", phone: "0039 333 111 2222" });
check("the same number in another spelling is a duplicate", dup.error === "duplicate", dup.error);
check("and it says who it clashes with", /Ana/.test(dup.message), dup.message);
check("still one of them", listFriends().length === 1);
const self = addFriend({ name: "Me", phone: "+39 333 123 4567" });
check("you cannot add yourself", self.error === "self", self.error);
check("renaming works", renameFriend("+393331112222", "Ana B").ok && listFriends()[0].name === "Ana B");
check("renaming to nothing does not", !renameFriend("+393331112222", "  ").ok
  && listFriends()[0].name === "Ana B");
check("and it is found by any spelling of the number",
  renameFriend("0039 333 111 2222", "Ana C").ok && listFriends()[0].name === "Ana C");

console.log("\nSHARING IS OFF UNTIL YOU TURN IT ON");
reset();
addFriend({ name: "Ana", phone: "+393331112222" });
const noProfile = setSharing("+393331112222", true);
check("you cannot share before you have said who you are", noProfile.error === "noProfile");
check("so nothing is shared", sharingWith().length === 0);
saveProfile({ name: "Simo", phone: "+393331234567" });
check("with a profile it works", setSharing("+393331112222", true).ok);
check("and that person is shared with", sharingWith().length === 1 && sharingWith()[0].name === "Ana");
check("turning it off works too", setSharing("+393331112222", false).ok && sharingWith().length === 0);
check("turning it off never needs a profile",
  (() => { clearProfile(); return setSharing("+393331112222", false).ok; })());
saveProfile({ name: "Simo", phone: "+393331234567" });
addFriend({ name: "Bo", phone: "+393331113333" });
setSharing("+393331112222", true);
check("sharing with one does not share with the other",
  sharingWith().length === 1 && sharingWith()[0].name === "Ana",
  sharingWith().map((f) => f.name).join(", "));
check("a switch is found by any spelling of the number",
  setSharing("0039 333 111 3333", true).ok && sharingWith().length === 2);
removeFriend("+39 333 111 2222");
check("removing someone removes them", listFriends().length === 1 && listFriends()[0].name === "Bo");
check("and stops sharing with them", !sharingWith().some((f) => f.name === "Ana"));

console.log("\nNAMES DO NOT GET TO BE PARAGRAPHS");
reset();
saveProfile({ name: "Simo", phone: "+393331234567" });
const long = "Maria Chiara Bertolini della Valle d'Aosta and friends";
addFriend({ name: long, phone: "+393331119999" });
check("a very long name is cut to something a row can hold",
  listFriends()[0].name.length === MAX_NAME, `${listFriends()[0].name.length} of ${MAX_NAME}`);
check("and it is cut, not rejected", listFriends().length === 1);
addFriend({ name: "  Ana   Maria  ", phone: "+393331118888" });
check("runs of whitespace collapse", listFriends()[1].name === "Ana Maria", `"${listFriends()[1].name}"`);
check("a name of only spaces is still nothing",
  addFriend({ name: "     ", phone: "+393331117777" }).error === "name");
check("the same applies to your own name",
  saveProfile({ name: long, phone: "+393331234567" }).ok && getProfile().name.length === MAX_NAME);

console.log("\nIT SURVIVES A RELOAD");
reset();
saveProfile({ name: "Simo", phone: "+393331234567" });
addFriend({ name: "Ana", phone: "+393331112222" });
setSharing("+393331112222", true);
const raw = JSON.parse(store["skis.v1"]);
check("the profile is written to storage", raw.profile.phone === "+393331234567");
check("so are the friends", raw.friends.length === 1 && raw.friends[0].sharing === true);
check("and no other field was trampled", raw.profile.ability !== undefined);

console.log(failures ? `\n  ${failures} FAILING\n` : "\n  all friends checks passed\n");
process.exit(failures ? 1 : 0);
