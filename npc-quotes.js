/* Short historical quotations. Sources and translation notes travel with the words.
 * Arcade lessons and activities are separate, authored dialogue. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.CodaMusicianQuotes=api;})(typeof window==='undefined'?null:window,function(){
 'use strict';
 const entries={
  bach:{text:'I was made to work; if you are equally industrious you will be equally successful.',source:'J. N. Forkel, Johann Sebastian Bach: His Life, Art, and Work, chapter VIII; English translation by Charles Sanford Terry (1920).',note:'Reported by Bach’s biographer; translated from German.',url:'https://www.gutenberg.org/ebooks/35041'},
  mozart:{text:'but I can by tones, for I am a musician.',source:'Letter to his father, Mannheim, 8 November 1777; The Letters of Wolfgang Amadeus Mozart, volume I, letter 73, translated by Lady Wallace.',note:'A translated excerpt from a letter about expressing thoughts and feelings through music.',url:'https://www.gutenberg.org/ebooks/5307'},
  beethoven:{text:'the greater the advances we make in art, the less are we satisfied with our works of an earlier date.',source:'Letter to Friedrich von Matthisson, 4 August 1800; Beethoven’s Letters 1790–1826, volume I, letter 16, translated by Lady Wallace.',note:'A translated excerpt about growing as an artist.',url:'https://www.gutenberg.org/ebooks/13065'},
  clara:{text:'In many free hours I used to grow enthusiastic over piano arrangements of operas and other music.',source:'Clara Schumann’s recollections, quoted in Arthur Elson, Woman’s Work in Music (1903), chapter IV.',note:'A translated recollection of enjoying music in her free time.',url:'https://www.gutenberg.org/ebooks/20571'},
  joplin:{text:'It is never right to play Ragtime fast.',source:'Scott Joplin, School of Ragtime (1908), printed instruction above the exercises.',note:'A written instruction from Joplin’s ragtime teaching score.',url:'https://imslp.org/wiki/School_of_Ragtime_(Joplin%2C_Scott)'},
  ellington:{text:'Love you madly.',source:'Duke Ellington’s signature greeting and sign-off, also used throughout Music Is My Mistress (1973).',note:'Ellington’s familiar affectionate greeting to his audiences.',url:'https://www.si.edu/spotlight/duke-ellington'},
  ella:{text:'The only thing better than singing is more singing.',source:'Ella Fitzgerald; quoted in The New York Times, “Ella Fitzgerald, the Voice of Jazz, Dies at 79” (16 June 1996).',note:'A remembered remark about her love of singing.',url:'https://www.nytimes.com/1996/06/16/nyregion/ella-fitzgerald-the-voice-of-jazz-dies-at-79.html'},
  nina:{text:'I’ll tell you what freedom is to me: no fear.',source:'Nina Simone, filmed interview with Peter Rodis (1968).',note:'A spoken interview excerpt. Simone is describing what freedom means to her.',url:'https://www.ninasimone.com/biography/'},
  miles:{text:'The thing to judge in any jazz artist is, does the man project and does he have ideas.',source:'Nat Hentoff, “An Afternoon with Miles Davis,” The Jazz Review, volume 1, number 2 (December 1958).',note:'A spoken interview excerpt about musical expression and ideas.',url:'https://www.jazzstudiesonline.org/'},
  schoenberg:{text:'I am a conservative who was forced to become a radical.',source:'Quoted in H. H. Stuckenschmidt, Schoenberg: His Life, World and Work (English translation, 1977).',note:'A translated remark about how his musical style developed, reported by his biographer.',url:'https://www.schoenberg.at/'},
  handel:{text:'I should be sorry if I only entertained them; I wished to make them better.',source:'John Hawkins, A General History of the Science and Practice of Music (1776), account of Handel’s conversation with Lord Kinnoull.',note:'Reported by a biographer, rather than preserved in Handel’s handwriting.',url:'https://www.gutenberg.org/ebooks/search/?query=John+Hawkins+music'},
  vivaldi:{text:'ninety-four operas composed by me',source:'Letter to Marchese Guido Bentivoglio, 2 January 1737; discussed in Michael Talbot, The Vivaldi Compendium (2011).',note:'A translated phrase from a letter about his opera work. This was Vivaldi’s own count; scholars discuss which versions and works he included.',url:'https://boydellandbrewer.com/9781843836704/the-vivaldi-compendium/'},
  chopin:{text:'You must sing if you wish to play',source:'Chopin’s advice to Madame Rubio, reported in Frederick Niecks, Frederick Chopin as a Man and Musician, volume II, chapter XXIX.',note:'Translated advice reported by his pupil: listen for singing phrases when playing piano.',url:'https://www.gutenberg.org/ebooks/4972'},
  haydn:{text:'I was forced to become original.',source:'Georg August Griesinger, Biographische Notizen über Joseph Haydn (1810), recollection of Haydn’s work at Eszterháza.',note:'A translated excerpt reported by his biographer. Haydn was describing the freedom to try new musical ideas.',url:'https://archive.org/details/biographischeno00grie'}
 };
 const concepts={
  bach:'Counterpoint is like two friends singing different tunes together. Each tune has its own path, but they fit together. Listen to one tune, then try to hear the other.',
  mozart:'A variation is a new way to play a tune you know. Think of singing Happy Birthday softly, then with bouncy little notes. The tune is still there, wearing a different costume!',
  beethoven:'A motif is a tiny musical idea, like da-da-da-DUM. You can play it again, make it louder, or move it to higher notes. A little idea can grow into a whole piece of music!',
  clara:'A musical phrase is like a little sentence made of notes. It has a beginning and a place to rest. Sing a short tune, then take a breath. You just found the end of a phrase!',
  joplin:'Syncopation is a little surprise between the beats. Tap a steady one, two, one, two. Now say POP between your taps. The beat keeps walking while your POP skips between its steps!',
  ellington:'Tone color is what makes one instrument sound different from another. A trumpet can sound bright, and a flute can sound light and airy. Play the same tune on both. Same tune, different colors!',
  ella:'Scat singing means making up a tune with playful sounds instead of words. Try singing ba-doo-bee! Now make up a little answer. Your voice can play like an instrument.',
  nina:'Expression is how you put a feeling into music. Sing a tune as if you are happy, then as if you are sleepy. You can use the same notes and tell a different story!',
  miles:'Improvising means making up music as you go. Pick a few notes and play a tiny tune. Stop and listen, then make up an answer. It is like telling a story with sounds.',
  schoenberg:'A twelve-tone row is a line of all twelve different note sounds, with each one used once before the line starts again. Imagine twelve different colored beads. Put them in an order, then try that order backward!',
  handel:'A chorus is a group of people singing together. Some voices sing high, and some sing low. Like friends building one big sandcastle, all those voices help make one big sound!',
  vivaldi:'A concerto lets one instrument take a turn in front of a bigger group. Imagine one violin saying hello and all the other instruments answering. The solo player and the group share the musical story.',
  chopin:'Legato means joining notes smoothly. Imagine drawing one long, curvy line instead of lots of little dots. Sing a short tune that way, then try to make your piano notes sound just as connected.',
  haydn:'A musical question sounds like it wants something to come next. A musical answer sounds ready to rest. Hum a little question, then hum an answer. Music can have a conversation!'
 };
 const names={bach:'J. S. Bach',mozart:'Mozart',beethoven:'Beethoven',clara:'Clara Schumann',joplin:'Scott Joplin',ellington:'Duke Ellington',ella:'Ella Fitzgerald',nina:'Nina Simone',miles:'Miles Davis',schoenberg:'Arnold Schoenberg',handel:'George Frideric Handel',vivaldi:'Antonio Vivaldi',chopin:'Frédéric Chopin',haydn:'Joseph Haydn'};
 const byId=Object.freeze(Object.fromEntries(Object.entries(entries).map(([id,entry])=>[id,Object.freeze({id,name:names[id],...entry})])));
 const get=id=>Object.hasOwn(byId,id)?byId[id]:null;
 const line=id=>{const entry=get(id);return entry?entry.text:'';};
 const credit=id=>{const entry=get(id);return entry?'Source: '+entry.source+' '+entry.note:'';};
 const advice=id=>Object.hasOwn(concepts,id)?concepts[id]:'';
 return Object.freeze({byId,get,line,credit,advice});
});
