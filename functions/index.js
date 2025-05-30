// functions/index.js
const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();

exports.logRsvpChanges = onDocumentWritten(
    "rsvps/{rsvpId}",
    async (event) => {
      const before = event.data.before || null;
      const after = event.data.after || null;
      const rsvpId = event.params.rsvpId;
      const [userId, eventId] = rsvpId.split("_");

      // Skip if nothing actually changed
      if (before && after && before.attending === after.attending) {
        logger.log("No change in attending for", rsvpId);
        return;
      }

      // Extract attendance values
      const beforeAtt = (before && before.attending != null) ?
      before.attending :
      null;
      const afterAtt = (after && after.attending != null) ?
      after.attending :
      null;

      // Determine change type
      const type = !before ?
      "created" :
      !after ?
        "deleted" :
        "updated";

      // Write to your changelog collection
      await admin
          .firestore()
          .collection("rsvpChangeLog")
          .add({
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            userId,
            eventId,
            type,
            before: beforeAtt,
            after: afterAtt,
          });

      logger.log("Logged RSVP change for", rsvpId);
    },
);
