exports = function(sentence, languages) {
  if (languages === "fr_en") {
    if (sentence === "bonjour") {
      return "hello";
    } else {
      return "what?";
    }
  } else if (languages === "en_fr") {
    if (sentence === "hello") {
      return "bonjour";
    } else {
      return "que?";
    }
  } else {
    throw new Error("Watch your language!");
  }
};