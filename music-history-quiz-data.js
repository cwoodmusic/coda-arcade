/* Authored quiz questions are grounded in the facts in music-history-data.js. */
(function(root,factory){
 const questions=factory();
 if(typeof module==='object'&&module.exports)module.exports=questions;
 if(root)root.CodaMusicHistoryQuizData=questions;
})(typeof window==='undefined'?null:window,function(){
 'use strict';
 const QUESTIONS=[
  {
    "id": "bach-quiz-01",
    "person": "bach",
    "factId": "bach-01",
    "prompt": "In which town was J. S. Bach born?",
    "choices": [
      "Eisenach",
      "Salzburg",
      "Vienna"
    ],
    "answer": 0
  },
  {
    "id": "bach-quiz-02",
    "person": "bach",
    "factId": "bach-05",
    "prompt": "What happens to the musical subject in a fugue?",
    "choices": [
      "It is played once, then replaced by a contrasting theme.",
      "It enters in different voices, one after another.",
      "It is repeated only by the same voice, without other entries."
    ],
    "answer": 1
  },
  {
    "id": "bach-quiz-03",
    "person": "bach",
    "factId": "bach-06",
    "prompt": "Which keys do the preludes and fugues of Bach’s Well-Tempered Clavier explore?",
    "choices": [
      "Only the major keys",
      "Only C major and A minor",
      "All 24 major and minor keys"
    ],
    "answer": 2
  },
  {
    "id": "bach-quiz-04",
    "person": "bach",
    "factId": "bach-08",
    "prompt": "What do Bach’s six Brandenburg Concertos explore?",
    "choices": [
      "Different combinations of solo instruments",
      "Different dance rhythms for a single solo instrument",
      "Different combinations of choral voices without instruments"
    ],
    "answer": 0
  },
  {
    "id": "bach-quiz-05",
    "person": "bach",
    "factId": "bach-11",
    "prompt": "What returns at the end of Bach’s Goldberg Variations?",
    "choices": [
      "A newly added choir",
      "The opening aria",
      "The first cello suite"
    ],
    "answer": 1
  },
  {
    "id": "bach-quiz-06",
    "person": "bach",
    "factId": "bach-15",
    "prompt": "What was Anna Magdalena Bach’s own musical profession?",
    "choices": [
      "Violin maker",
      "Organ builder",
      "Singer"
    ],
    "answer": 2
  },
  {
    "id": "bach-quiz-07",
    "person": "bach",
    "factId": "bach-18",
    "prompt": "Which of Bach’s sons worked in London and influenced the young Mozart?",
    "choices": [
      "Johann Christian Bach",
      "Carl Philipp Emanuel Bach",
      "Wilhelm Friedemann Bach"
    ],
    "answer": 0
  },
  {
    "id": "bach-quiz-08",
    "person": "bach",
    "factId": "bach-22",
    "prompt": "Whose concertos helped shape Bach’s concerto writing?",
    "choices": [
      "Johannes Brahms’s",
      "Antonio Vivaldi’s",
      "Frédéric Chopin’s"
    ],
    "answer": 1
  },
  {
    "id": "bach-quiz-09",
    "person": "bach",
    "factId": "bach-25",
    "prompt": "Why did Bach travel to Lübeck in 1705?",
    "choices": [
      "To direct the first performance of Messiah",
      "To study piano with Haydn",
      "To hear Dieterich Buxtehude"
    ],
    "answer": 2
  },
  {
    "id": "bach-quiz-10",
    "person": "bach",
    "factId": "bach-30",
    "prompt": "Who directed the 1829 performance that helped renew interest in Bach’s St. Matthew Passion?",
    "choices": [
      "Felix Mendelssohn",
      "Franz Liszt",
      "Richard Wagner"
    ],
    "answer": 0
  },
  {
    "id": "mozart-quiz-01",
    "person": "mozart",
    "factId": "mozart-03",
    "prompt": "Which instrument did Mozart’s sister Nannerl play with great skill?",
    "choices": [
      "Keyboard",
      "Trumpet",
      "Timpani"
    ],
    "answer": 0
  },
  {
    "id": "mozart-quiz-02",
    "person": "mozart",
    "factId": "mozart-07",
    "prompt": "Where did Mozart settle in 1781 to pursue work beyond one court employer?",
    "choices": [
      "London",
      "Vienna",
      "Paris"
    ],
    "answer": 1
  },
  {
    "id": "mozart-quiz-03",
    "person": "mozart",
    "factId": "mozart-09",
    "prompt": "What relationship is central to a concerto?",
    "choices": [
      "A choir singing without any instruments",
      "A spoken scene alternating with a silent dance",
      "A solo instrument or solo group contrasted with an ensemble"
    ],
    "answer": 2
  },
  {
    "id": "mozart-quiz-04",
    "person": "mozart",
    "factId": "mozart-10",
    "prompt": "Who wrote the libretto for Mozart’s The Marriage of Figaro?",
    "choices": [
      "Lorenzo Da Ponte",
      "Emanuel Schikaneder",
      "Friedrich Schiller"
    ],
    "answer": 0
  },
  {
    "id": "mozart-quiz-05",
    "person": "mozart",
    "factId": "mozart-12",
    "prompt": "Which combination is part of The Magic Flute?",
    "choices": [
      "Singing throughout, without spoken dialogue",
      "Spoken dialogue and singing",
      "Instrumental scenes with spoken narration but no singing"
    ],
    "answer": 1
  },
  {
    "id": "mozart-quiz-06",
    "person": "mozart",
    "factId": "mozart-15",
    "prompt": "For which clarinetist did Mozart write his Clarinet Concerto?",
    "choices": [
      "Joseph Joachim",
      "Johann Peter Salomon",
      "Anton Stadler"
    ],
    "answer": 2
  },
  {
    "id": "mozart-quiz-07",
    "person": "mozart",
    "factId": "mozart-19",
    "prompt": "Who completed the best-known early performing version of Mozart’s unfinished Requiem?",
    "choices": [
      "Franz Xaver Süssmayr",
      "Antonio Salieri",
      "Joseph Haydn"
    ],
    "answer": 0
  },
  {
    "id": "mozart-quiz-08",
    "person": "mozart",
    "factId": "mozart-20",
    "prompt": "Which catalogue gives Mozart’s works numbers that often begin with K?",
    "choices": [
      "The Hoboken catalogue",
      "The Köchel catalogue",
      "The Ryom catalogue"
    ],
    "answer": 1
  },
  {
    "id": "mozart-quiz-09",
    "person": "mozart",
    "factId": "mozart-22",
    "prompt": "To whom did Mozart dedicate a set of six string quartets?",
    "choices": [
      "Ludwig van Beethoven",
      "Christoph Willibald Gluck",
      "Joseph Haydn"
    ],
    "answer": 2
  },
  {
    "id": "mozart-quiz-10",
    "person": "mozart",
    "factId": "mozart-30",
    "prompt": "Who helped preserve and promote Mozart’s music after his death?",
    "choices": [
      "His wife Constanze",
      "His pupil Franz Schubert",
      "His publisher John Stark"
    ],
    "answer": 0
  },
  {
    "id": "beethoven-quiz-01",
    "person": "beethoven",
    "factId": "beethoven-02",
    "prompt": "With whom did Beethoven study after moving to Vienna in 1792?",
    "choices": [
      "Joseph Haydn",
      "Frédéric Chopin",
      "Johann Christian Bach"
    ],
    "answer": 0
  },
  {
    "id": "beethoven-quiz-02",
    "person": "beethoven",
    "factId": "beethoven-05",
    "prompt": "What helps give the opening of Beethoven’s Fifth Symphony its identity?",
    "choices": [
      "A long folk-song melody repeated without alteration",
      "A tiny rhythmic idea developed into a large work",
      "A sequence of independent dance movements"
    ],
    "answer": 1
  },
  {
    "id": "beethoven-quiz-03",
    "person": "beethoven",
    "factId": "beethoven-07",
    "prompt": "What does Beethoven add to the orchestra in his Ninth Symphony?",
    "choices": [
      "A solo piano accompanying every movement",
      "A solo violin leading the melody throughout",
      "Solo singers and a choir"
    ],
    "answer": 2
  },
  {
    "id": "beethoven-quiz-04",
    "person": "beethoven",
    "factId": "beethoven-09",
    "prompt": "How many piano sonatas did Beethoven write?",
    "choices": [
      "32",
      "12",
      "48"
    ],
    "answer": 0
  },
  {
    "id": "beethoven-quiz-05",
    "person": "beethoven",
    "factId": "beethoven-12",
    "prompt": "What is the title of Beethoven’s only opera?",
    "choices": [
      "Don Giovanni",
      "Fidelio",
      "The Magic Flute"
    ],
    "answer": 1
  },
  {
    "id": "beethoven-quiz-06",
    "person": "beethoven",
    "factId": "beethoven-18",
    "prompt": "What does Beethoven discuss in the private Heiligenstadt Testament?",
    "choices": [
      "Instructions for staging Fidelio",
      "The catalogue numbers of his piano sonatas",
      "His struggles with hearing loss"
    ],
    "answer": 2
  },
  {
    "id": "beethoven-quiz-07",
    "person": "beethoven",
    "factId": "beethoven-20",
    "prompt": "Whose name did Beethoven remove from the Eroica score’s dedication?",
    "choices": [
      "Napoleon’s",
      "Haydn’s",
      "Schubert’s"
    ],
    "answer": 0
  },
  {
    "id": "beethoven-quiz-08",
    "person": "beethoven",
    "factId": "beethoven-22",
    "prompt": "Which musical eras does Beethoven’s work help connect?",
    "choices": [
      "The Renaissance and early Baroque",
      "The Classical era and Romantic musical ideas",
      "The swing era and bebop"
    ],
    "answer": 1
  },
  {
    "id": "beethoven-quiz-09",
    "person": "beethoven",
    "factId": "beethoven-26",
    "prompt": "Which composer was among the torchbearers at Beethoven’s funeral?",
    "choices": [
      "Felix Mendelssohn",
      "Johannes Brahms",
      "Franz Schubert"
    ],
    "answer": 2
  },
  {
    "id": "beethoven-quiz-10",
    "person": "beethoven",
    "factId": "beethoven-28",
    "prompt": "Which pianist-composer helped develop the piano sonata tradition?",
    "choices": [
      "Muzio Clementi",
      "George Frideric Handel",
      "Domenico Cimarosa"
    ],
    "answer": 0
  },
  {
    "id": "clara-quiz-01",
    "person": "clara",
    "factId": "clara-01",
    "prompt": "What was Clara Schumann’s family name before her marriage?",
    "choices": [
      "Wieck",
      "Hensel",
      "Martines"
    ],
    "answer": 0
  },
  {
    "id": "clara-quiz-02",
    "person": "clara",
    "factId": "clara-06",
    "prompt": "When did Clara begin composing her Piano Concerto in A minor?",
    "choices": [
      "After retiring from performing",
      "While she was a teenager",
      "After she began teaching in Frankfurt"
    ],
    "answer": 1
  },
  {
    "id": "clara-quiz-03",
    "person": "clara",
    "factId": "clara-08",
    "prompt": "Who conducted the premiere of Clara’s Piano Concerto?",
    "choices": [
      "Johannes Brahms",
      "Franz Liszt",
      "Felix Mendelssohn"
    ],
    "answer": 2
  },
  {
    "id": "clara-quiz-04",
    "person": "clara",
    "factId": "clara-11",
    "prompt": "To which violinist did Clara dedicate her Three Romances for violin and piano?",
    "choices": [
      "Joseph Joachim",
      "Louis Spohr",
      "Johann Peter Salomon"
    ],
    "answer": 0
  },
  {
    "id": "clara-quiz-05",
    "person": "clara",
    "factId": "clara-15",
    "prompt": "Whose music did Clara champion as well as Robert Schumann’s?",
    "choices": [
      "Antonio Vivaldi’s",
      "Johannes Brahms’s",
      "Scott Joplin’s"
    ],
    "answer": 1
  },
  {
    "id": "clara-quiz-06",
    "person": "clara",
    "factId": "clara-19",
    "prompt": "Which performance practice did Clara help champion?",
    "choices": [
      "Playing all piano music with a chamber ensemble",
      "Performing only newly composed piano works",
      "Playing piano music from memory"
    ],
    "answer": 2
  },
  {
    "id": "clara-quiz-07",
    "person": "clara",
    "factId": "clara-20",
    "prompt": "Where did Clara begin teaching in 1878?",
    "choices": [
      "The Hoch Conservatory in Frankfurt",
      "The St. Thomas School in Leipzig",
      "The Paris Conservatory"
    ],
    "answer": 0
  },
  {
    "id": "clara-quiz-08",
    "person": "clara",
    "factId": "clara-23",
    "prompt": "Which two musical figures were siblings who shared ideas?",
    "choices": [
      "Clara Schumann and Johannes Brahms",
      "Fanny Hensel and Felix Mendelssohn",
      "Clara Schumann and Joseph Joachim"
    ],
    "answer": 1
  },
  {
    "id": "clara-quiz-09",
    "person": "clara",
    "factId": "clara-25",
    "prompt": "Which contemporary’s piano works did Clara perform?",
    "choices": [
      "Arnold Schoenberg’s",
      "Duke Ellington’s",
      "Frédéric Chopin’s"
    ],
    "answer": 2
  },
  {
    "id": "clara-quiz-10",
    "person": "clara",
    "factId": "clara-29",
    "prompt": "What happened to Clara’s performing career after Robert died in 1856?",
    "choices": [
      "She continued performing for many years.",
      "She immediately retired from all concerts.",
      "She switched entirely to conducting orchestras."
    ],
    "answer": 0
  },
  {
    "id": "joplin-quiz-01",
    "person": "joplin",
    "factId": "joplin-01",
    "prompt": "In which area did Scott Joplin grow up?",
    "choices": [
      "Texarkana",
      "New Orleans",
      "Chicago"
    ],
    "answer": 0
  },
  {
    "id": "joplin-quiz-02",
    "person": "joplin",
    "factId": "joplin-03",
    "prompt": "How do the melody and accompaniment often work together in ragtime?",
    "choices": [
      "A steady melody plays without any accompaniment",
      "A syncopated melody plays over a steady accompaniment",
      "Every part accents exactly the same beats"
    ],
    "answer": 1
  },
  {
    "id": "joplin-quiz-03",
    "person": "joplin",
    "factId": "joplin-05",
    "prompt": "Which Joplin work was published in 1899?",
    "choices": [
      "The Entertainer",
      "Solace",
      "Maple Leaf Rag"
    ],
    "answer": 2
  },
  {
    "id": "joplin-quiz-04",
    "person": "joplin",
    "factId": "joplin-07",
    "prompt": "Which publisher helped bring Joplin’s music to readers?",
    "choices": [
      "John Stark",
      "Billy Strayhorn",
      "Norman Granz"
    ],
    "answer": 0
  },
  {
    "id": "joplin-quiz-05",
    "person": "joplin",
    "factId": "joplin-12",
    "prompt": "Which film helped bring The Entertainer to a new audience in 1973?",
    "choices": [
      "Porgy and Bess",
      "The Sting",
      "Fantasia"
    ],
    "answer": 1
  },
  {
    "id": "joplin-quiz-06",
    "person": "joplin",
    "factId": "joplin-13",
    "prompt": "What did Joplin warn performers about when playing ragtime?",
    "choices": [
      "Playing it on a piano",
      "Playing more than one musical section",
      "Playing it too fast"
    ],
    "answer": 2
  },
  {
    "id": "joplin-quiz-07",
    "person": "joplin",
    "factId": "joplin-17",
    "prompt": "Which dance tradition is connected with the habanera rhythm in Solace?",
    "choices": [
      "Cuban dance music",
      "Polish dance music",
      "Viennese waltzes"
    ],
    "answer": 0
  },
  {
    "id": "joplin-quiz-08",
    "person": "joplin",
    "factId": "joplin-19",
    "prompt": "What does Treemonisha present as a source of community strength and freedom?",
    "choices": [
      "Winning competitions",
      "Education",
      "Wealth alone"
    ],
    "answer": 1
  },
  {
    "id": "joplin-quiz-09",
    "person": "joplin",
    "factId": "joplin-23",
    "prompt": "Which fellow ragtime composer collaborated with Joplin on several rags?",
    "choices": [
      "George Gershwin",
      "John Coltrane",
      "Scott Hayden"
    ],
    "answer": 2
  },
  {
    "id": "joplin-quiz-10",
    "person": "joplin",
    "factId": "joplin-30",
    "prompt": "Which honor did Joplin receive after his death?",
    "choices": [
      "A Pulitzer Prize special award",
      "The Presidential Medal of Freedom",
      "The National Medal of Arts"
    ],
    "answer": 0
  },
  {
    "id": "ellington-quiz-01",
    "person": "ellington",
    "factId": "ellington-01",
    "prompt": "What was Duke Ellington’s birth name?",
    "choices": [
      "Edward Kennedy Ellington",
      "William Thomas Strayhorn",
      "Edward William Basie"
    ],
    "answer": 0
  },
  {
    "id": "ellington-quiz-02",
    "person": "ellington",
    "factId": "ellington-04",
    "prompt": "Which Harlem club became closely associated with Ellington’s orchestra?",
    "choices": [
      "The Music Box",
      "The Cotton Club",
      "The Apollo Theater"
    ],
    "answer": 1
  },
  {
    "id": "ellington-quiz-03",
    "person": "ellington",
    "factId": "ellington-06",
    "prompt": "What often guided Ellington when he wrote for his orchestra?",
    "choices": [
      "A rule that every instrument must sound alike",
      "Using the same arrangement for every band",
      "The distinctive sounds of particular band members"
    ],
    "answer": 2
  },
  {
    "id": "ellington-quiz-04",
    "person": "ellington",
    "factId": "ellington-10",
    "prompt": "What can a plunger mute help a brass player produce?",
    "choices": [
      "A speech-like wah sound",
      "A bowed string sound",
      "A louder drumbeat"
    ],
    "answer": 0
  },
  {
    "id": "ellington-quiz-05",
    "person": "ellington",
    "factId": "ellington-14",
    "prompt": "Where did Black, Brown and Beige premiere in 1943?",
    "choices": [
      "The Savoy Ballroom",
      "Carnegie Hall",
      "The Newport Jazz Festival"
    ],
    "answer": 1
  },
  {
    "id": "ellington-quiz-06",
    "person": "ellington",
    "factId": "ellington-18",
    "prompt": "Who wrote Take the A Train?",
    "choices": [
      "Duke Ellington",
      "Count Basie",
      "Billy Strayhorn"
    ],
    "answer": 2
  },
  {
    "id": "ellington-quiz-07",
    "person": "ellington",
    "factId": "ellington-20",
    "prompt": "What inspired Ellington’s Such Sweet Thunder suite?",
    "choices": [
      "Shakespeare",
      "The seasons of the year",
      "A train journey across America"
    ],
    "answer": 0
  },
  {
    "id": "ellington-quiz-08",
    "person": "ellington",
    "factId": "ellington-23",
    "prompt": "Which saxophonist played an extended solo at Ellington’s 1956 Newport appearance?",
    "choices": [
      "Harry Carney",
      "Paul Gonsalves",
      "Johnny Hodges"
    ],
    "answer": 1
  },
  {
    "id": "ellington-quiz-09",
    "person": "ellington",
    "factId": "ellington-27",
    "prompt": "Which contemporary was a pianist, composer, and arranger across several jazz eras?",
    "choices": [
      "Lorraine Hansberry",
      "Daphne Oram",
      "Mary Lou Williams"
    ],
    "answer": 2
  },
  {
    "id": "ellington-quiz-10",
    "person": "ellington",
    "factId": "ellington-29",
    "prompt": "Which honor did Ellington receive in 1969?",
    "choices": [
      "The Presidential Medal of Freedom",
      "A posthumous Pulitzer Prize special award",
      "The National Medal of Arts"
    ],
    "answer": 0
  },
  {
    "id": "ella-quiz-01",
    "person": "ella",
    "factId": "ella-03",
    "prompt": "At which theater did Ella Fitzgerald win an amateur-night contest in 1934?",
    "choices": [
      "The Apollo Theater",
      "Carnegie Hall",
      "The Cotton Club"
    ],
    "answer": 0
  },
  {
    "id": "ella-quiz-02",
    "person": "ella",
    "factId": "ella-04",
    "prompt": "Whose orchestra did Fitzgerald join in the 1930s?",
    "choices": [
      "Count Basie’s",
      "Chick Webb’s",
      "Duke Ellington’s"
    ],
    "answer": 1
  },
  {
    "id": "ella-quiz-03",
    "person": "ella",
    "factId": "ella-06",
    "prompt": "Which Fitzgerald recording became a major hit in 1938?",
    "choices": [
      "Mack the Knife",
      "I Loves You, Porgy",
      "A-Tisket, A-Tasket"
    ],
    "answer": 2
  },
  {
    "id": "ella-quiz-04",
    "person": "ella",
    "factId": "ella-09",
    "prompt": "What does a scat singer use in place of a song’s usual words?",
    "choices": [
      "Improvised syllables",
      "Only the written lyrics",
      "Spoken introductions"
    ],
    "answer": 0
  },
  {
    "id": "ella-quiz-05",
    "person": "ella",
    "factId": "ella-13",
    "prompt": "Which songwriter was the focus of Fitzgerald’s first Verve songbook album?",
    "choices": [
      "George Gershwin",
      "Cole Porter",
      "Irving Berlin"
    ],
    "answer": 1
  },
  {
    "id": "ella-quiz-06",
    "person": "ella",
    "factId": "ella-17",
    "prompt": "Who managed Fitzgerald and founded Verve?",
    "choices": [
      "John Stark",
      "Teo Macero",
      "Norman Granz"
    ],
    "answer": 2
  },
  {
    "id": "ella-quiz-07",
    "person": "ella",
    "factId": "ella-19",
    "prompt": "Which trumpeter and singer recorded celebrated duet albums with Fitzgerald?",
    "choices": [
      "Louis Armstrong",
      "Miles Davis",
      "Dizzy Gillespie"
    ],
    "answer": 0
  },
  {
    "id": "ella-quiz-08",
    "person": "ella",
    "factId": "ella-24",
    "prompt": "What did Fitzgerald do after forgetting words to Mack the Knife at a Berlin concert?",
    "choices": [
      "Repeated only the song’s introduction",
      "Improvised new lyrics",
      "Ended the performance immediately"
    ],
    "answer": 1
  },
  {
    "id": "ella-quiz-09",
    "person": "ella",
    "factId": "ella-28",
    "prompt": "Whose bebop style helped inspire Fitzgerald’s scat singing?",
    "choices": [
      "Scott Joplin’s",
      "Frédéric Chopin’s",
      "Dizzy Gillespie’s"
    ],
    "answer": 2
  },
  {
    "id": "ella-quiz-10",
    "person": "ella",
    "factId": "ella-29",
    "prompt": "Which honor did Fitzgerald receive in 1987?",
    "choices": [
      "The National Medal of Arts",
      "The Presidential Medal of Freedom",
      "A Pulitzer Prize special award"
    ],
    "answer": 0
  },
  {
    "id": "nina-quiz-01",
    "person": "nina",
    "factId": "nina-01",
    "prompt": "What was Nina Simone’s birth name?",
    "choices": [
      "Eunice Kathleen Waymon",
      "Ella Jane Fitzgerald",
      "Mary Lou Williams"
    ],
    "answer": 0
  },
  {
    "id": "nina-quiz-02",
    "person": "nina",
    "factId": "nina-03",
    "prompt": "What musical training did Simone have before becoming known as a singer?",
    "choices": [
      "Orchestral percussion",
      "Classical piano",
      "Classical trumpet"
    ],
    "answer": 1
  },
  {
    "id": "nina-quiz-03",
    "person": "nina",
    "factId": "nina-06",
    "prompt": "Where was Simone working when she adopted her stage name?",
    "choices": [
      "Paris",
      "New Orleans",
      "Atlantic City"
    ],
    "answer": 2
  },
  {
    "id": "nina-quiz-04",
    "person": "nina",
    "factId": "nina-09",
    "prompt": "From which opera does I Loves You, Porgy come?",
    "choices": [
      "Porgy and Bess",
      "Treemonisha",
      "Fidelio"
    ],
    "answer": 0
  },
  {
    "id": "nina-quiz-05",
    "person": "nina",
    "factId": "nina-15",
    "prompt": "What prompted Simone to write Mississippi Goddam?",
    "choices": [
      "A piano teaching exercise",
      "Racist violence in 1963",
      "A commission for a film comedy"
    ],
    "answer": 1
  },
  {
    "id": "nina-quiz-06",
    "person": "nina",
    "factId": "nina-19",
    "prompt": "Who wrote To Be Young, Gifted and Black with Simone?",
    "choices": [
      "Langston Hughes",
      "Billy Strayhorn",
      "Weldon Irvine"
    ],
    "answer": 2
  },
  {
    "id": "nina-quiz-07",
    "person": "nina",
    "factId": "nina-20",
    "prompt": "Which playwright does To Be Young, Gifted and Black honor?",
    "choices": [
      "Lorraine Hansberry",
      "William Shakespeare",
      "Lorenzo Da Ponte"
    ],
    "answer": 0
  },
  {
    "id": "nina-quiz-08",
    "person": "nina",
    "factId": "nina-24",
    "prompt": "How does Simone’s Sinnerman build intensity?",
    "choices": [
      "By removing the pulse and piano throughout",
      "Through repetition and a driving piano part",
      "By keeping every phrase at the same quiet level"
    ],
    "answer": 1
  },
  {
    "id": "nina-quiz-09",
    "person": "nina",
    "factId": "nina-25",
    "prompt": "Which contemporary also connected music with political resistance?",
    "choices": [
      "Clara Schumann",
      "Maria Anna Mozart",
      "Miriam Makeba"
    ],
    "answer": 2
  },
  {
    "id": "nina-quiz-10",
    "person": "nina",
    "factId": "nina-29",
    "prompt": "What is the title of Simone’s 1991 autobiography?",
    "choices": [
      "I Put a Spell on You",
      "Little Girl Blue",
      "To Be Young, Gifted and Black"
    ],
    "answer": 0
  },
  {
    "id": "miles-quiz-01",
    "person": "miles",
    "factId": "miles-03",
    "prompt": "Which instrument did Miles Davis play?",
    "choices": [
      "Trumpet",
      "Alto saxophone",
      "Piano"
    ],
    "answer": 0
  },
  {
    "id": "miles-quiz-02",
    "person": "miles",
    "factId": "miles-06",
    "prompt": "Which saxophonist did Davis play with early in his career?",
    "choices": [
      "Harry Carney",
      "Charlie Parker",
      "Johnny Hodges"
    ],
    "answer": 1
  },
  {
    "id": "miles-quiz-03",
    "person": "miles",
    "factId": "miles-08",
    "prompt": "How large was the ensemble used in the Birth of the Cool recordings?",
    "choices": [
      "Three players",
      "A full symphony orchestra",
      "Nine players"
    ],
    "answer": 2
  },
  {
    "id": "miles-quiz-04",
    "person": "miles",
    "factId": "miles-11",
    "prompt": "Which musical sources helped shape Sketches of Spain?",
    "choices": [
      "Spanish concert music and traditional musical ideas",
      "Polish dances and mazurkas",
      "American ragtime piano pieces"
    ],
    "answer": 0
  },
  {
    "id": "miles-quiz-05",
    "person": "miles",
    "factId": "miles-14",
    "prompt": "Which Davis album was recorded in 1959?",
    "choices": [
      "In a Silent Way",
      "Kind of Blue",
      "Bitches Brew"
    ],
    "answer": 1
  },
  {
    "id": "miles-quiz-06",
    "person": "miles",
    "factId": "miles-16",
    "prompt": "What can modal jazz give improvisers room to explore?",
    "choices": [
      "Only one fixed melody with no changes",
      "Only percussion patterns without pitches",
      "A scale or mode rather than rapidly changing chords"
    ],
    "answer": 2
  },
  {
    "id": "miles-quiz-07",
    "person": "miles",
    "factId": "miles-18",
    "prompt": "Who played piano on Freddie Freeloader from Kind of Blue?",
    "choices": [
      "Wynton Kelly",
      "Bill Evans",
      "Herbie Hancock"
    ],
    "answer": 0
  },
  {
    "id": "miles-quiz-08",
    "person": "miles",
    "factId": "miles-20",
    "prompt": "Which musician belonged to Davis’s second great quintet?",
    "choices": [
      "Cootie Williams",
      "Wayne Shorter",
      "Charlie Parker"
    ],
    "answer": 1
  },
  {
    "id": "miles-quiz-09",
    "person": "miles",
    "factId": "miles-25",
    "prompt": "What technique did Teo Macero use to help shape Davis’s recordings?",
    "choices": [
      "Hand-copying music onto piano rolls",
      "Acoustic recording without microphones",
      "Tape editing"
    ],
    "answer": 2
  },
  {
    "id": "miles-quiz-10",
    "person": "miles",
    "factId": "miles-29",
    "prompt": "Which former Davis band member built a major career in acoustic jazz and electronic music?",
    "choices": [
      "Herbie Hancock",
      "Red Garland",
      "Paul Chambers"
    ],
    "answer": 0
  },
  {
    "id": "chopin-quiz-01",
    "person": "chopin",
    "factId": "chopin-01",
    "prompt": "Near which city was Chopin born?",
    "choices": [
      "Warsaw",
      "Vienna",
      "Salzburg"
    ],
    "answer": 0
  },
  {
    "id": "chopin-quiz-02",
    "person": "chopin",
    "factId": "chopin-05",
    "prompt": "In which city did Chopin eventually settle after leaving Poland?",
    "choices": [
      "London",
      "Paris",
      "Bonn"
    ],
    "answer": 1
  },
  {
    "id": "chopin-quiz-03",
    "person": "chopin",
    "factId": "chopin-08",
    "prompt": "How do Chopin’s études combine learning and expression?",
    "choices": [
      "They keep technical exercises separate from musical expression.",
      "They use only slow, unchanging five-finger patterns.",
      "They join technical challenges with expressive musical ideas."
    ],
    "answer": 2
  },
  {
    "id": "chopin-quiz-04",
    "person": "chopin",
    "factId": "chopin-10",
    "prompt": "What is the range of keys in Chopin’s 24 Preludes, Op. 28?",
    "choices": [
      "All 24 major and minor keys",
      "Only the twelve major keys",
      "Only the twelve minor keys"
    ],
    "answer": 0
  },
  {
    "id": "chopin-quiz-05",
    "person": "chopin",
    "factId": "chopin-12",
    "prompt": "What rhythmic feature is often heard in a mazurka?",
    "choices": [
      "A strict two-beat march with no accents",
      "Unexpected emphasis within a three-beat measure",
      "Strong emphasis always fixed on the first beat"
    ],
    "answer": 1
  },
  {
    "id": "chopin-quiz-06",
    "person": "chopin",
    "factId": "chopin-15",
    "prompt": "Who helped establish the piano nocturne before Chopin developed it further?",
    "choices": [
      "Muzio Clementi",
      "Johann Nepomuk Hummel",
      "John Field"
    ],
    "answer": 2
  },
  {
    "id": "chopin-quiz-07",
    "person": "chopin",
    "factId": "chopin-18",
    "prompt": "What were Chopin’s waltzes often intended for?",
    "choices": [
      "Listening rather than ordinary ballroom dancing",
      "Strictly accompanying ballroom dancing",
      "Teaching orchestras to play waltz accompaniments"
    ],
    "answer": 0
  },
  {
    "id": "chopin-quiz-08",
    "person": "chopin",
    "factId": "chopin-20",
    "prompt": "What does rubato allow a performer to do?",
    "choices": [
      "Play every piece at exactly the same tempo",
      "Use expressive flexibility in timing while keeping a sense of pulse",
      "Change tempo randomly without a sense of pulse"
    ],
    "answer": 1
  },
  {
    "id": "chopin-quiz-09",
    "person": "chopin",
    "factId": "chopin-24",
    "prompt": "Which composer praised Chopin’s early music in print?",
    "choices": [
      "George Frideric Handel",
      "Antonio Vivaldi",
      "Robert Schumann"
    ],
    "answer": 2
  },
  {
    "id": "chopin-quiz-10",
    "person": "chopin",
    "factId": "chopin-30",
    "prompt": "Where is Chopin’s heart kept?",
    "choices": [
      "Holy Cross Church in Warsaw",
      "St. Stephen’s Cathedral in Vienna",
      "St. Thomas Church in Leipzig"
    ],
    "answer": 0
  },
  {
    "id": "haydn-quiz-01",
    "person": "haydn",
    "factId": "haydn-02",
    "prompt": "Where did Haydn sing as a choirboy?",
    "choices": [
      "St. Stephen’s Cathedral in Vienna",
      "St. Thomas Church in Leipzig",
      "Westminster Abbey in London"
    ],
    "answer": 0
  },
  {
    "id": "haydn-quiz-02",
    "person": "haydn",
    "factId": "haydn-03",
    "prompt": "For which family did Haydn work for much of his adult life?",
    "choices": [
      "The Bach family",
      "The Esterházy family",
      "The Schumann family"
    ],
    "answer": 1
  },
  {
    "id": "haydn-quiz-03",
    "person": "haydn",
    "factId": "haydn-07",
    "prompt": "Which instruments usually make up a string quartet?",
    "choices": [
      "A violin, a flute, a trumpet, and a drum",
      "Two cellos and two double basses",
      "Two violins, a viola, and a cello"
    ],
    "answer": 2
  },
  {
    "id": "haydn-quiz-04",
    "person": "haydn",
    "factId": "haydn-10",
    "prompt": "What creates the famous surprise in Haydn’s Surprise Symphony?",
    "choices": [
      "A sudden loud chord in the slow movement",
      "A soloist entering from the audience",
      "All players leaving in the first movement"
    ],
    "answer": 0
  },
  {
    "id": "haydn-quiz-05",
    "person": "haydn",
    "factId": "haydn-12",
    "prompt": "What happens near the end of Haydn’s Farewell Symphony?",
    "choices": [
      "The whole orchestra returns for a new first movement.",
      "Players leave one by one until two violinists remain.",
      "A choir joins the orchestra for the final song."
    ],
    "answer": 1
  },
  {
    "id": "haydn-quiz-06",
    "person": "haydn",
    "factId": "haydn-16",
    "prompt": "Who helped arrange Haydn’s successful London visits?",
    "choices": [
      "Anton Stadler",
      "Joseph Joachim",
      "Johann Peter Salomon"
    ],
    "answer": 2
  },
  {
    "id": "haydn-quiz-07",
    "person": "haydn",
    "factId": "haydn-19",
    "prompt": "How is an oratorio usually presented?",
    "choices": [
      "As a musical story without staged acting or scenery",
      "With staged acting, costumes, and scenery like an opera",
      "As an instrumental suite without vocal storytelling"
    ],
    "answer": 0
  },
  {
    "id": "haydn-quiz-08",
    "person": "haydn",
    "factId": "haydn-22",
    "prompt": "Which unusual bowed instrument did Haydn write music for because his patron favored it?",
    "choices": [
      "The clarinet",
      "The baryton",
      "The harpsichord"
    ],
    "answer": 1
  },
  {
    "id": "haydn-quiz-09",
    "person": "haydn",
    "factId": "haydn-26",
    "prompt": "Which composer studied with Haydn after arriving in Vienna in 1792?",
    "choices": [
      "Frédéric Chopin",
      "Johannes Brahms",
      "Ludwig van Beethoven"
    ],
    "answer": 2
  },
  {
    "id": "haydn-quiz-10",
    "person": "haydn",
    "factId": "haydn-28",
    "prompt": "Which composer and keyboard player lived in Vienna during Haydn’s lifetime?",
    "choices": [
      "Marianna Martines",
      "Clara Schumann",
      "Fanny Hensel"
    ],
    "answer": 0
  },
  {
    "id": "dj-quiz-01",
    "person": "dj",
    "factId": "dj-05",
    "prompt": "What does beatmatching line up between two recordings?",
    "choices": [
      "Their pulses",
      "Their lyrics",
      "Their instrument names"
    ],
    "answer": 0
  },
  {
    "id": "dj-quiz-02",
    "person": "dj",
    "factId": "dj-06",
    "prompt": "What does a crossfader let a DJ change?",
    "choices": [
      "The order of notes stored in a melody",
      "The length of a turntable’s tonearm",
      "The balance between two audio sources"
    ],
    "answer": 2
  },
  {
    "id": "dj-quiz-03",
    "person": "dj",
    "factId": "dj-10",
    "prompt": "Which kick-drum pattern is often associated with disco?",
    "choices": [
      "A kick only on beats two and four",
      "A steady kick on all four beats of the bar",
      "A kick only on beats one and three"
    ],
    "answer": 1
  },
  {
    "id": "dj-quiz-04",
    "person": "dj",
    "factId": "dj-12",
    "prompt": "Who helped develop the extended disco remix?",
    "choices": [
      "Tom Moulton",
      "Duke Ellington",
      "John Field"
    ],
    "answer": 0
  },
  {
    "id": "dj-quiz-05",
    "person": "dj",
    "factId": "dj-15",
    "prompt": "Whose Bronx parties are central to the early history of hip-hop?",
    "choices": [
      "David Mancuso’s",
      "Francis Grasso’s",
      "DJ Kool Herc’s"
    ],
    "answer": 2
  },
  {
    "id": "dj-quiz-06",
    "person": "dj",
    "factId": "dj-19",
    "prompt": "Who is widely credited with developing record scratching?",
    "choices": [
      "Ron Hardy",
      "Grand Wizzard Theodore",
      "Giorgio Moroder"
    ],
    "answer": 1
  },
  {
    "id": "dj-quiz-07",
    "person": "dj",
    "factId": "dj-22",
    "prompt": "In which city’s 1980s club scene did house music grow?",
    "choices": [
      "Chicago",
      "Detroit",
      "New Orleans"
    ],
    "answer": 0
  },
  {
    "id": "dj-quiz-08",
    "person": "dj",
    "factId": "dj-23",
    "prompt": "Which Chicago club is closely associated with Frankie Knuckles’s role in house music?",
    "choices": [
      "The Cotton Club",
      "The Savoy Ballroom",
      "The Warehouse"
    ],
    "answer": 2
  },
  {
    "id": "dj-quiz-09",
    "person": "dj",
    "factId": "dj-26",
    "prompt": "Which group of musicians helped shape Detroit techno?",
    "choices": [
      "John Coltrane, Bill Evans, and Paul Chambers",
      "Juan Atkins, Derrick May, and Kevin Saunderson",
      "Duke Ellington, Billy Strayhorn, and Johnny Hodges"
    ],
    "answer": 1
  },
  {
    "id": "dj-quiz-10",
    "person": "dj",
    "factId": "dj-29",
    "prompt": "What is sampling in music?",
    "choices": [
      "Reusing recorded sound as material for a new work",
      "Lining up the pulses of two recordings",
      "Changing a live instrument’s strings before a performance"
    ],
    "answer": 0
  },
  {
    "id": "vee-jay-quiz-01",
    "person": "vee-jay",
    "factId": "vee-jay-03",
    "prompt": "Who demonstrated the phonograph in 1877?",
    "choices": [
      "Thomas Edison",
      "Emile Berliner",
      "Robert Moog"
    ],
    "answer": 0
  },
  {
    "id": "vee-jay-quiz-02",
    "person": "vee-jay",
    "factId": "vee-jay-04",
    "prompt": "Which recording invention is associated with Emile Berliner?",
    "choices": [
      "The magnetic tape loop",
      "The voltage-controlled synthesizer",
      "The flat-disc gramophone"
    ],
    "answer": 2
  },
  {
    "id": "vee-jay-quiz-03",
    "person": "vee-jay",
    "factId": "vee-jay-06",
    "prompt": "What did electrical recording bring into commercial recording studios in the 1920s?",
    "choices": [
      "Digital audio workstations",
      "Microphones",
      "Flat-screen televisions"
    ],
    "answer": 1
  },
  {
    "id": "vee-jay-quiz-04",
    "person": "vee-jay",
    "factId": "vee-jay-10",
    "prompt": "What does multitrack recording allow musicians to do?",
    "choices": [
      "Record different parts separately",
      "Capture all parts together in one live take",
      "Store sound using mechanical grooves alone"
    ],
    "answer": 0
  },
  {
    "id": "vee-jay-quiz-05",
    "person": "vee-jay",
    "factId": "vee-jay-13",
    "prompt": "Which material could a musique concrète composer use?",
    "choices": [
      "Unrecorded live instrumental sounds alone",
      "Only newly written orchestral melodies",
      "Recorded everyday noises as well as other recorded sounds"
    ],
    "answer": 2
  },
  {
    "id": "vee-jay-quiz-06",
    "person": "vee-jay",
    "factId": "vee-jay-15",
    "prompt": "Which 1940 animated film presented orchestral concert music?",
    "choices": [
      "Thriller",
      "Fantasia",
      "The Sting"
    ],
    "answer": 1
  },
  {
    "id": "vee-jay-quiz-07",
    "person": "vee-jay",
    "factId": "vee-jay-18",
    "prompt": "Which machines let people watch Soundies?",
    "choices": [
      "Coin-operated Panorams",
      "Player pianos controlled by paper rolls",
      "Early portable cassette players"
    ],
    "answer": 0
  },
  {
    "id": "vee-jay-quiz-08",
    "person": "vee-jay",
    "factId": "vee-jay-24",
    "prompt": "What was MTV’s first broadcast music video?",
    "choices": [
      "Bohemian Rhapsody by Queen",
      "Thriller by Michael Jackson",
      "Video Killed the Radio Star by the Buggles"
    ],
    "answer": 2
  },
  {
    "id": "vee-jay-quiz-09",
    "person": "vee-jay",
    "factId": "vee-jay-27",
    "prompt": "Who may work with a director to make a music video?",
    "choices": [
      "Piano technicians, organ builders, and music engravers",
      "Choreographers, editors, and production designers",
      "Orchestra librarians, instrument tuners, and concert ushers"
    ],
    "answer": 1
  },
  {
    "id": "vee-jay-quiz-10",
    "person": "vee-jay",
    "factId": "vee-jay-29",
    "prompt": "What do Foley artists create for films?",
    "choices": [
      "Sound effects matched to actions on screen",
      "New lyrics for every soundtrack song",
      "The printed parts used by the orchestra"
    ],
    "answer": 0
  },
  {
    "id": "zizi-quiz-01",
    "person": "zizi",
    "factId": "zizi-02",
    "prompt": "Which instrument is a plucked string instrument associated with Hindustani music?",
    "choices": [
      "Sitar",
      "Tabla",
      "Shakuhachi"
    ],
    "answer": 0
  },
  {
    "id": "zizi-quiz-02",
    "person": "zizi",
    "factId": "zizi-05",
    "prompt": "What does a raga provide in Indian classical music?",
    "choices": [
      "A pair of hand drums",
      "A fixed orchestral seating plan",
      "A melodic framework"
    ],
    "answer": 2
  },
  {
    "id": "zizi-quiz-03",
    "person": "zizi",
    "factId": "zizi-06",
    "prompt": "What does a tala organize?",
    "choices": [
      "The order of singers in a chorus",
      "Musical time in recurring cycles",
      "The tuning pegs on a lute"
    ],
    "answer": 1
  },
  {
    "id": "zizi-quiz-04",
    "person": "zizi",
    "factId": "zizi-09",
    "prompt": "Which instruments often appear in Indonesian gamelan ensembles?",
    "choices": [
      "Bronze gongs and metallophones",
      "Bowed strings and a continuo keyboard",
      "Saxophones, brass, and a drum kit"
    ],
    "answer": 0
  },
  {
    "id": "zizi-quiz-05",
    "person": "zizi",
    "factId": "zizi-13",
    "prompt": "What do griots in West Africa preserve through words, music, and performance?",
    "choices": [
      "Instrument-building methods alone",
      "Printed orchestral scores alone",
      "Histories"
    ],
    "answer": 2
  },
  {
    "id": "zizi-quiz-06",
    "person": "zizi",
    "factId": "zizi-16",
    "prompt": "Which description fits the oud?",
    "choices": [
      "A pair of hand drums used in Hindustani music",
      "A fretless plucked lute used in Middle Eastern and North African traditions",
      "A Japanese end-blown bamboo flute"
    ],
    "answer": 1
  },
  {
    "id": "zizi-quiz-07",
    "person": "zizi",
    "factId": "zizi-19",
    "prompt": "Which description fits the shakuhachi?",
    "choices": [
      "A Japanese end-blown bamboo flute",
      "A Chinese plucked lute held upright",
      "A West African string instrument with a gourd body"
    ],
    "answer": 0
  },
  {
    "id": "zizi-quiz-08",
    "person": "zizi",
    "factId": "zizi-23",
    "prompt": "Which combination often appears in a mariachi ensemble?",
    "choices": [
      "Only bronze gongs and metallophones",
      "Only flutes and seven-string zithers",
      "Violins, trumpets, and several kinds of guitar"
    ],
    "answer": 2
  },
  {
    "id": "zizi-quiz-09",
    "person": "zizi",
    "factId": "zizi-25",
    "prompt": "Which instrument became central to Argentine tango?",
    "choices": [
      "Kora",
      "Bandoneon",
      "Guqin"
    ],
    "answer": 1
  },
  {
    "id": "zizi-quiz-10",
    "person": "zizi",
    "factId": "zizi-29",
    "prompt": "Which musician helped develop Afrobeat in Nigeria?",
    "choices": [
      "Fela Kuti",
      "Astor Piazzolla",
      "Antônio Carlos Jobim"
    ],
    "answer": 0
  },
  {
    "id": "metronome-quiz-01",
    "person": "metronome",
    "factId": "metronome-04",
    "prompt": "Which composer was an early major user of published metronome markings?",
    "choices": [
      "Beethoven",
      "Vivaldi",
      "Handel"
    ],
    "answer": 0
  },
  {
    "id": "metronome-quiz-02",
    "person": "metronome",
    "factId": "metronome-06",
    "prompt": "Besides its number, what must a metronome marking identify?",
    "choices": [
      "Its key signature",
      "Its starting dynamic",
      "Its beat unit"
    ],
    "answer": 2
  },
  {
    "id": "metronome-quiz-03",
    "person": "metronome",
    "factId": "metronome-09",
    "prompt": "What stores performances for a traditional player piano?",
    "choices": [
      "Sounds stored on magnetic tape",
      "Patterns on a roll",
      "Grooves on a flat disc"
    ],
    "answer": 1
  },
  {
    "id": "metronome-quiz-04",
    "person": "metronome",
    "factId": "metronome-11",
    "prompt": "What is a polyrhythm?",
    "choices": [
      "Contrasting rhythmic patterns combined at the same time",
      "A single melody played without accompaniment",
      "A gradual change in an instrument’s tone color"
    ],
    "answer": 0
  },
  {
    "id": "metronome-quiz-05",
    "person": "metronome",
    "factId": "metronome-13",
    "prompt": "Which composer wrote Piano Phase?",
    "choices": [
      "Philip Glass",
      "Terry Riley",
      "Steve Reich"
    ],
    "answer": 2
  },
  {
    "id": "metronome-quiz-06",
    "person": "metronome",
    "factId": "metronome-16",
    "prompt": "What instrument did Wendy Carlos use to perform Bach’s music on Switched-On Bach?",
    "choices": [
      "A player piano",
      "A Moog synthesizer",
      "A theremin"
    ],
    "answer": 1
  },
  {
    "id": "metronome-quiz-07",
    "person": "metronome",
    "factId": "metronome-21",
    "prompt": "Who created the electronic realization of the original Doctor Who theme?",
    "choices": [
      "Delia Derbyshire",
      "Daphne Oram",
      "Wendy Carlos"
    ],
    "answer": 0
  },
  {
    "id": "metronome-quiz-08",
    "person": "metronome",
    "factId": "metronome-23",
    "prompt": "How does a performer play the theremin?",
    "choices": [
      "By pressing keys that strike metal strings",
      "By turning a paper roll through a mechanical piano",
      "By moving the hands near antennas without touching the instrument"
    ],
    "answer": 2
  },
  {
    "id": "metronome-quiz-09",
    "person": "metronome",
    "factId": "metronome-27",
    "prompt": "What do MIDI messages describe?",
    "choices": [
      "Photographs of the performer’s hand positions",
      "Performance events such as note starts and stops",
      "Audio recordings of the instrument’s sound"
    ],
    "answer": 1
  },
  {
    "id": "metronome-quiz-10",
    "person": "metronome",
    "factId": "metronome-29",
    "prompt": "What is a digital audio workstation used for?",
    "choices": [
      "Recording, editing, and arranging music on a computer",
      "Reading musical time from a mechanical pendulum",
      "Changing the physical length of a brass instrument"
    ],
    "answer": 0
  },
  {
    "id": "schoenberg-quiz-01",
    "person": "schoenberg",
    "factId": "schoenberg-01",
    "prompt": "Where was Arnold Schoenberg born in 1874?",
    "choices": [
      "Vienna",
      "Berlin",
      "Leipzig"
    ],
    "answer": 0
  },
  {
    "id": "schoenberg-quiz-02",
    "person": "schoenberg",
    "factId": "schoenberg-03",
    "prompt": "Who was an important early teacher and colleague of Schoenberg?",
    "choices": [
      "Johann Christian Bach",
      "Alexander Zemlinsky",
      "Joseph Haydn"
    ],
    "answer": 1
  },
  {
    "id": "schoenberg-quiz-03",
    "person": "schoenberg",
    "factId": "schoenberg-06",
    "prompt": "For which ensemble was Verklärte Nacht first written?",
    "choices": [
      "A piano trio",
      "A brass quintet",
      "A string sextet"
    ],
    "answer": 2
  },
  {
    "id": "schoenberg-quiz-04",
    "person": "schoenberg",
    "factId": "schoenberg-10",
    "prompt": "What can atonal music avoid establishing?",
    "choices": [
      "One key as the music’s main home",
      "Any written rhythms",
      "Any combination of instruments"
    ],
    "answer": 0
  },
  {
    "id": "schoenberg-quiz-05",
    "person": "schoenberg",
    "factId": "schoenberg-11",
    "prompt": "What does Schoenberg’s Second String Quartet add in its final two movements?",
    "choices": [
      "A second string quartet",
      "A soprano singer",
      "A solo trumpet"
    ],
    "answer": 1
  },
  {
    "id": "schoenberg-quiz-06",
    "person": "schoenberg",
    "factId": "schoenberg-15",
    "prompt": "What does Sprechstimme combine?",
    "choices": [
      "Two pianists playing identical parts",
      "A drum solo and a dance",
      "Features of speaking and singing"
    ],
    "answer": 2
  },
  {
    "id": "schoenberg-quiz-07",
    "person": "schoenberg",
    "factId": "schoenberg-17",
    "prompt": "What is a twelve-tone row?",
    "choices": [
      "An ordering of the twelve pitch classes",
      "A major scale played twice",
      "A list of twelve different instruments"
    ],
    "answer": 0
  },
  {
    "id": "schoenberg-quiz-08",
    "person": "schoenberg",
    "factId": "schoenberg-22",
    "prompt": "Which visual art did Schoenberg also practice?",
    "choices": [
      "Sculpture",
      "Painting",
      "Architecture"
    ],
    "answer": 1
  },
  {
    "id": "schoenberg-quiz-09",
    "person": "schoenberg",
    "factId": "schoenberg-26",
    "prompt": "Which composers are grouped with Schoenberg as the Second Viennese School?",
    "choices": [
      "Mozart and Haydn",
      "Bach and Handel",
      "Alban Berg and Anton Webern"
    ],
    "answer": 2
  },
  {
    "id": "schoenberg-quiz-10",
    "person": "schoenberg",
    "factId": "schoenberg-29",
    "prompt": "Where did Schoenberg teach after moving to the United States?",
    "choices": [
      "Los Angeles, including UCLA",
      "New York, at the Juilliard School",
      "Chicago, at the University of Chicago"
    ],
    "answer": 0
  },
  {
    "id": "handel-quiz-01",
    "person": "handel",
    "factId": "handel-02",
    "prompt": "Which pair of composers shares Handel’s birth year?",
    "choices": [
      "J. S. Bach and Domenico Scarlatti",
      "Mozart and Joseph Haydn",
      "Beethoven and Franz Schubert"
    ],
    "answer": 0
  },
  {
    "id": "handel-quiz-02",
    "person": "handel",
    "factId": "handel-06",
    "prompt": "Where was Handel’s opera Agrippina first performed?",
    "choices": [
      "Vienna",
      "Paris",
      "Venice"
    ],
    "answer": 2
  },
  {
    "id": "handel-quiz-03",
    "person": "handel",
    "factId": "handel-12",
    "prompt": "Which combination describes important parts of Handel’s London career?",
    "choices": [
      "English-language symphonies and Italian-language string quartets",
      "Italian-language operas and English-language oratorios",
      "French-language ballets and German-language songs"
    ],
    "answer": 1
  },
  {
    "id": "handel-quiz-04",
    "person": "handel",
    "factId": "handel-13",
    "prompt": "How is an oratorio usually presented differently from an opera?",
    "choices": [
      "It is usually performed without staged action",
      "It is usually performed without any singers",
      "It is usually performed without any instruments"
    ],
    "answer": 0
  },
  {
    "id": "handel-quiz-05",
    "person": "handel",
    "factId": "handel-16",
    "prompt": "Which Handel opera contains the aria Ombra mai fu?",
    "choices": [
      "Rinaldo",
      "Rodelinda",
      "Serse"
    ],
    "answer": 2
  },
  {
    "id": "handel-quiz-06",
    "person": "handel",
    "factId": "handel-17",
    "prompt": "What occasion was associated with Handel’s Water Music in 1717?",
    "choices": [
      "A benefit concert at the Foundling Hospital",
      "A royal boating event on the River Thames",
      "A royal coronation in Westminster Abbey"
    ],
    "answer": 1
  },
  {
    "id": "handel-quiz-07",
    "person": "handel",
    "factId": "handel-20",
    "prompt": "In which city was Handel’s Messiah first performed?",
    "choices": [
      "Dublin",
      "London",
      "Hamburg"
    ],
    "answer": 0
  },
  {
    "id": "handel-quiz-08",
    "person": "handel",
    "factId": "handel-24",
    "prompt": "What feature often characterizes a recitative?",
    "choices": [
      "Every phrase has a repeated dance refrain",
      "The voice performs only long wordless notes",
      "Words follow the rhythms of speech"
    ],
    "answer": 2
  },
  {
    "id": "handel-quiz-09",
    "person": "handel",
    "factId": "handel-28",
    "prompt": "Whose concerto grosso tradition influenced Handel?",
    "choices": [
      "Arnold Schoenberg’s",
      "Arcangelo Corelli’s",
      "Frédéric Chopin’s"
    ],
    "answer": 1
  },
  {
    "id": "handel-quiz-10",
    "person": "handel",
    "factId": "handel-30",
    "prompt": "Where was Handel buried?",
    "choices": [
      "Westminster Abbey",
      "Père Lachaise Cemetery",
      "Holy Cross Church in Warsaw"
    ],
    "answer": 0
  },
  {
    "id": "vivaldi-quiz-01",
    "person": "vivaldi",
    "factId": "vivaldi-02",
    "prompt": "Who helped teach Vivaldi to play the violin?",
    "choices": [
      "His father, who was a violinist",
      "His brother, who was a flutist",
      "His mother, who was a cellist"
    ],
    "answer": 0
  },
  {
    "id": "vivaldi-quiz-02",
    "person": "vivaldi",
    "factId": "vivaldi-05",
    "prompt": "Why was Vivaldi nicknamed the Red Priest?",
    "choices": [
      "He always used red ink for scores",
      "He led an orchestra dressed in red",
      "He had red hair"
    ],
    "answer": 2
  },
  {
    "id": "vivaldi-quiz-03",
    "person": "vivaldi",
    "factId": "vivaldi-07",
    "prompt": "What was Venice’s Pietà, where Vivaldi worked?",
    "choices": [
      "A school devoted only to teaching organ builders",
      "A charitable institution for girls with a celebrated music program",
      "A royal court with an opera company"
    ],
    "answer": 1
  },
  {
    "id": "vivaldi-quiz-04",
    "person": "vivaldi",
    "factId": "vivaldi-13",
    "prompt": "What kind of works make up Vivaldi’s The Four Seasons?",
    "choices": [
      "Four violin concertos",
      "Four choral oratorios",
      "Four piano sonatas"
    ],
    "answer": 0
  },
  {
    "id": "vivaldi-quiz-05",
    "person": "vivaldi",
    "factId": "vivaldi-16",
    "prompt": "What was printed with The Four Seasons to describe the scenes in the music?",
    "choices": [
      "Stage directions for actors",
      "Letters from Vivaldi’s students",
      "Poems"
    ],
    "answer": 2
  },
  {
    "id": "vivaldi-quiz-06",
    "person": "vivaldi",
    "factId": "vivaldi-20",
    "prompt": "Which scenes does Vivaldi’s Winter suggest?",
    "choices": [
      "Birdsong, flowing streams, and spring weather",
      "Cold, shivering, and slipping on ice",
      "Harvest celebrations and a hunt"
    ],
    "answer": 1
  },
  {
    "id": "vivaldi-quiz-07",
    "person": "vivaldi",
    "factId": "vivaldi-22",
    "prompt": "Which movement plan appears in many Vivaldi concertos?",
    "choices": [
      "Fast–slow–fast",
      "Slow–fast–slow",
      "Three movements at the same slow tempo"
    ],
    "answer": 0
  },
  {
    "id": "vivaldi-quiz-08",
    "person": "vivaldi",
    "factId": "vivaldi-23",
    "prompt": "What happens in ritornello form?",
    "choices": [
      "Every player repeats one melody at exactly the same time",
      "A solo singer alternates spoken dialogue with dance",
      "A recurring ensemble passage alternates with contrasting episodes"
    ],
    "answer": 2
  },
  {
    "id": "vivaldi-quiz-09",
    "person": "vivaldi",
    "factId": "vivaldi-26",
    "prompt": "What performing forces are used in Vivaldi’s Gloria, RV 589?",
    "choices": [
      "String quartet without voices",
      "Soloists, choir, and orchestra",
      "Solo violin without accompaniment"
    ],
    "answer": 1
  },
  {
    "id": "vivaldi-quiz-10",
    "person": "vivaldi",
    "factId": "vivaldi-28",
    "prompt": "Which composer arranged several Vivaldi concertos for keyboard?",
    "choices": [
      "J. S. Bach",
      "Claude Debussy",
      "Johannes Brahms"
    ],
    "answer": 0
  }
];
 for(const question of QUESTIONS){Object.freeze(question.choices);Object.freeze(question);}
 return Object.freeze(QUESTIONS);
});
