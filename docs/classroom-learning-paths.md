# Short classroom lessons

The nine classroom categories share one structure: ordered basics, a five-question basics quiz, separate advanced sections, and the existing full category quiz. A section shows one teaching idea and example before its practice question. Wrong answers offer another try. Students can return to the category list and resume their place on the same device.

Rhythm begins with **Note parts → Note symbols (quarter, half, whole, eighth) → Rhythm tree → Counting**. Sixteenth notes and dotted notes are taught in the advanced sections. The treble and bass paths explain the staff and the clef, then introduce both bottom-to-top mnemonic maps before asking for staff note names.

`classroom-learning-paths-data.js` defines the categories and sections. All existing exam coverage cards remain available: the canonical eight-category exam and its 800 questions are unchanged. The accidentals/key-signatures category remains supplemental. Optional guided practice retains the piano, rhythm-tree, and listening activities.

The developer console's **Lessons & exams → Lesson cards** editor edits teaching, examples, questions, answer choices, and the new note-parts/clef/tree pictures. Older author drafts receive the new foundation cards once, tracked by `learningPathsVersion: 1`; existing edits and deletions are preserved. New exports preserve explicit foundation-card deletions too. Author drafts stay on the device until exported and published.

Short-section progress and basics quiz attempts use `codaClassroomLearningPathsV1`, a local-only, profile-scoped key. They do not create canonical quiz proof or XP. The complete category quiz uses the existing quiz records and once-only lesson reward. Existing earned achievements are retained; the cloud data format and Firebase rules are unchanged. Switching students clears this local practice, and returning to guest play restores the guest backup.
