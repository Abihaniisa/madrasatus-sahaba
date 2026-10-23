// src/lib/curriculum.ts — static curriculum data (7 classes × 2 semesters × 5 subjects × 18 weeks).
// Pure data. If a page has a curriculum bug, this file is NOT the suspect.
// If curriculum CONTENT changes, this is the ONLY file that changes.

export type CurriculumEntry = {
  overview: string;
  semester1: Record<string, string[]>;
  semester2: Record<string, string[]>;
};

const TAMHID_QURAN_S1 = [
  "Surah An-Nas, Al-Falaq, Al-Ikhlas, Al-Masad, An-Nasr. Learn with the teacher.",
  "Surah An-Nas, Al-Falaq, Al-Ikhlas, Al-Masad, An-Nasr. Repeat and correct mistakes.",
  "Surah An-Nas, Al-Falaq, Al-Ikhlas, Al-Masad, An-Nasr. Consolidate and recite independently.",
  "Surah Al-Kafirun, Al-Kawthar, Al-Ma'un, Quraysh, Al-Fil. Learn with the teacher.",
  "Surah Al-Kafirun, Al-Kawthar, Al-Ma'un, Quraysh, Al-Fil. Repeat and correct mistakes.",
  "Surah Al-Kafirun, Al-Kawthar, Al-Ma'un, Quraysh, Al-Fil. Consolidate and recite independently.",
  "Surah Al-Humazah, Al-'Asr, At-Takathur, Al-Qari'ah. Learn with the teacher.",
  "Surah Al-Humazah, Al-'Asr, At-Takathur, Al-Qari'ah. Repeat and correct mistakes.",
  "Surah Al-Humazah, Al-'Asr, At-Takathur, Al-Qari'ah. Consolidate and recite independently.",
  "Surah Al-'Adiyat, Az-Zalzalah, Al-Bayyinah. Learn with the teacher.",
  "Surah Al-'Adiyat, Az-Zalzalah, Al-Bayyinah. Repeat and correct mistakes.",
  "Surah Al-'Adiyat, Az-Zalzalah, Al-Bayyinah. Consolidate and recite independently.",
  "Surah Al-Qadr, Al-'Alaq, At-Tin. Learn with the teacher.",
  "Surah Al-Qadr, Al-'Alaq, At-Tin. Repeat and correct mistakes.",
  "Surah Al-Qadr, Al-'Alaq, At-Tin. Consolidate and recite independently.",
  "Surah Al-Inshirah, Ad-Duha, Al-Layl. Learn with the teacher.",
  "Surah Al-Inshirah, Ad-Duha, Al-Layl. Repeat and correct mistakes.",
  "Surah Al-Inshirah, Ad-Duha, Al-Layl. Consolidate and recite independently."
];
const TAMHID_QURAN_S2 = [
  "Surah Ash-Shams, Al-Balad, Al-Fajr. Learn with the teacher.",
  "Surah Ash-Shams, Al-Balad, Al-Fajr. Repeat and correct mistakes.",
  "Surah Ash-Shams, Al-Balad, Al-Fajr. Consolidate and recite independently.",
  "Surah Al-Ghashiyah, Al-A'la, At-Tariq. Learn with the teacher.",
  "Surah Al-Ghashiyah, Al-A'la, At-Tariq. Repeat and correct mistakes.",
  "Surah Al-Ghashiyah, Al-A'la, At-Tariq. Consolidate and recite independently.",
  "Surah Al-Buruj, Al-Inshiqaq, Al-Mutaffifin. Learn with the teacher.",
  "Surah Al-Buruj, Al-Inshiqaq, Al-Mutaffifin. Repeat and correct mistakes.",
  "Surah Al-Buruj, Al-Inshiqaq, Al-Mutaffifin. Consolidate and recite independently.",
  "Surah Al-Infitar, At-Takwir, Abasa. Learn with the teacher.",
  "Surah Al-Infitar, At-Takwir, Abasa. Repeat and correct mistakes.",
  "Surah Al-Infitar, At-Takwir, Abasa. Consolidate and recite independently.",
  "Surah An-Nazi'at, An-Naba, Al-Mursalat. Learn with the teacher.",
  "Surah An-Nazi'at, An-Naba, Al-Mursalat. Repeat and correct mistakes.",
  "Surah An-Nazi'at, An-Naba, Al-Mursalat. Consolidate and recite independently.",
  "Surah Al-Insan, Al-Qiyamah, Al-Muddaththir, Al-Muzzammil, Al-Jinn. Learn with the teacher.",
  "Surah Al-Insan, Al-Qiyamah, Al-Muddaththir, Al-Muzzammil, Al-Jinn. Repeat and correct mistakes.",
  "Surah Al-Insan, Al-Qiyamah, Al-Muddaththir, Al-Muzzammil, Al-Jinn. Consolidate and recite independently."
];
const TAMHID_HADITH_S1 = Array(18).fill("Hisnul Muslim (selected).");
const TAMHID_HADITH_S2 = Array(18).fill("Hisnul Muslim (selected).");
const TAMHID_ARABIC_S1 = Array(18).fill("Gateway to Arabic 1.");
const TAMHID_ARABIC_S2 = Array(18).fill("Gateway to Arabic 1.");

const IIDAD_QURAN_S1 = [
  "Surah Nuh. Learn with the teacher.", "Surah Nuh. Repeat and correct mistakes.", "Surah Nuh. Consolidate and recite independently.",
  "Surah Al-Ma'arij. Learn with the teacher.", "Surah Al-Ma'arij. Repeat and correct mistakes.", "Surah Al-Ma'arij. Consolidate and recite independently.",
  "Surah Al-Haqqah. Learn with the teacher.", "Surah Al-Haqqah. Repeat and correct mistakes.", "Surah Al-Haqqah. Consolidate and recite independently.",
  "Surah Al-Qalam. Learn with the teacher.", "Surah Al-Qalam. Repeat and correct mistakes.", "Surah Al-Qalam. Consolidate and recite independently.",
  "Surah Al-Mulk. Learn with the teacher.", "Surah Al-Mulk. Repeat and correct mistakes.", "Surah Al-Mulk. Consolidate and recite independently.",
  "Surah At-Tahrim. Learn with the teacher.", "Surah At-Tahrim. Repeat and correct mistakes.", "Surah At-Tahrim. Consolidate and recite independently."
];
const IIDAD_QURAN_S2 = [
  "Surah At-Talaq. Learn with the teacher.", "Surah At-Talaq. Repeat and correct mistakes.", "Surah At-Talaq. Consolidate and recite independently.",
  "Surah At-Taghabun. Learn with the teacher.", "Surah At-Taghabun. Repeat and correct mistakes.", "Surah At-Taghabun. Consolidate and recite independently.",
  "Surah Al-Munafiqun. Learn with the teacher.", "Surah Al-Munafiqun. Repeat and correct mistakes.", "Surah Al-Munafiqun. Consolidate and recite independently.",
  "Surah Al-Jumu'ah and As-Saff. Learn with the teacher.", "Surah Al-Jumu'ah and As-Saff. Repeat and correct mistakes.", "Surah Al-Jumu'ah and As-Saff. Consolidate and recite independently.",
  "Surah Al-Mumtahanah and Al-Hashr. Learn with the teacher.", "Surah Al-Mumtahanah and Al-Hashr. Repeat and correct mistakes.", "Surah Al-Mumtahanah and Al-Hashr. Consolidate and recite independently.",
  "Surah Al-Mujadilah. Learn with the teacher.", "Surah Al-Mujadilah. Repeat and correct mistakes.", "Surah Al-Mujadilah. Consolidate and recite independently."
];
const IIDAD_HADITH_S1 = Array(18).fill("Khamsun Hadith.");
const IIDAD_HADITH_S2 = Array(18).fill("Khamsun Hadith.");
const IIDAD_ARABIC_S1 = Array(18).fill("Gateway to Arabic Book 2.");
const IIDAD_ARABIC_S2 = Array(18).fill("Gateway to Arabic Book 2.");

const T1_QURAN_S1 = [
  "Rub 181. As-Saffat, Ayah 145.", "Rub 182. Sad, Ayah 21.", "Rub 183. Sad, Ayah 52.",
  "Rub 184. Az-Zumar, Ayah 8.", "Rub 185. Az-Zumar, Ayah 32.", "Rub 186. Az-Zumar, Ayah 53.",
  "Rub 187. Ghafir, Ayah 1.", "Rub 188. Ghafir, Ayah 21.", "Rub 189. Ghafir, Ayah 41.",
  "Rub 190. Ghafir, Ayah 66.", "Rub 191. Fussilat, Ayah 9.", "Rub 192. Fussilat, Ayah 25.",
  "Rub 193. Fussilat, Ayah 47.", "Rub 194. Ash-Shura, Ayah 13.", "Rub 195. Ash-Shura, Ayah 27.",
  "Rub 196. Ash-Shura, Ayah 51.", "Rub 197. Az-Zukhruf, Ayah 24.", "Rub 198. Az-Zukhruf, Ayah 57."
];
const T1_QURAN_S2 = [
  "Rub 199. Ad-Dukhan, Ayah 17.", "Rub 200. Al-Jathiyah, Ayah 12.", "Rub 201. Al-Ahqaf, Ayah 1.",
  "Rub 202. Al-Ahqaf, Ayah 21.", "Rub 203. Muhammad, Ayah 10.", "Rub 204. Muhammad, Ayah 33.",
  "Rub 205. Al-Fath, Ayah 18.", "Rub 206. Al-Hujurat, Ayah 1.", "Rub 207. Al-Hujurat, Ayah 14.",
  "Rub 208. Qaf, Ayah 27.", "Rub 209. Adh-Dhariyat, Ayah 31.", "Rub 210. At-Tur, Ayah 24.",
  "Rub 211. An-Najm, Ayah 26.", "Rub 212. Al-Qamar, Ayah 9.", "Rub 213. Ar-Rahman, Ayah 1.",
  "Rub 214. Al-Waqi'ah, Ayah 1.", "Rub 215. Al-Waqi'ah, Ayah 75.", "Rub 216. Al-Hadid, Ayah 16."
];
const T1_HADITH_S1 = Array(18).fill("Miatu Hadith.");
const T1_HADITH_S2 = Array(18).fill("Miatu Hadith.");
const T1_ARABIC_S1 = Array(18).fill("Nahwul Wadih Primary 1.");
const T1_ARABIC_S2 = Array(18).fill("Nahwul Wadih Primary 1.");
const T1_FIQH_S1 = Array(18).fill("Mukhtasar al-Akhdari.");
const T1_FIQH_S2 = Array(18).fill("Mukhtasar al-Akhdari.");
const T1_TAJWEED_S1 = Array(18).fill("Kitabut Tajweed Lil marhalat Rabia wal khamisa.");
const T1_TAJWEED_S2 = Array(18).fill("Kitabut Tajweed Lil marhalat Rabia wal khamisa.");

const T2_QURAN_S1 = [
  "Rub 145. Al-Furqan, Ayah 21.", "Rub 146. Al-Furqan, Ayah 53.", "Rub 147. Ash-Shu'ara, Ayah 1.",
  "Rub 148. Ash-Shu'ara, Ayah 52.", "Rub 149. Ash-Shu'ara, Ayah 111.", "Rub 150. Ash-Shu'ara, Ayah 181.",
  "Rub 151. An-Naml, Ayah 1.", "Rub 152. An-Naml, Ayah 27.", "Rub 153. An-Naml, Ayah 56.",
  "Rub 154. An-Naml, Ayah 82.", "Rub 155. Al-Qasas, Ayah 12.", "Rub 156. Al-Qasas, Ayah 29.",
  "Rub 157. Al-Qasas, Ayah 51.", "Rub 158. Al-Qasas, Ayah 76.", "Rub 159. Al-'Ankabut, Ayah 1.",
  "Rub 160. Al-'Ankabut, Ayah 26.", "Rub 161. Al-'Ankabut, Ayah 46.", "Rub 162. Ar-Rum, Ayah 1."
];
const T2_QURAN_S2 = [
  "Rub 163. Ar-Rum, Ayah 31.", "Rub 164. Ar-Rum, Ayah 54.", "Rub 165. Luqman, Ayah 22.",
  "Rub 166. As-Sajdah, Ayah 11.", "Rub 167. Al-Ahzab, Ayah 1.", "Rub 168. Al-Ahzab, Ayah 18.",
  "Rub 169. Al-Ahzab, Ayah 31.", "Rub 170. Al-Ahzab, Ayah 51.", "Rub 171. Al-Ahzab, Ayah 60.",
  "Rub 172. Saba, Ayah 10.", "Rub 173. Saba, Ayah 24.", "Rub 174. Saba, Ayah 46.",
  "Rub 175. Fatir, Ayah 15.", "Rub 176. Fatir, Ayah 41.", "Rub 177. Ya-Sin, Ayah 28.",
  "Rub 178. Ya-Sin, Ayah 60.", "Rub 179. As-Saffat, Ayah 22.", "Rub 180. As-Saffat, Ayah 83."
];
const T2_HADITH_S1 = Array(18).fill("Arba'una Hadith.");
const T2_HADITH_S2 = Array(18).fill("Arba'una Hadith.");
const T2_ARABIC_S1 = Array(18).fill("Nahwul Wadih Primary 2.");
const T2_ARABIC_S2 = Array(18).fill("Nahwul Wadih Primary 2.");
const T2_FIQH_S1 = Array(18).fill("First half of Hallul Masail.");
const T2_FIQH_S2 = Array(18).fill("First half of Hallul Masail.");
const T2_TAJWEED_S1 = Array(18).fill("Bidayat al-Talib.");
const T2_TAJWEED_S2 = Array(18).fill("Bidayat al-Talib.");

const T3_QURAN_S1 = [
  "Rub 109. An-Nahl, Ayah 51.", "Rub 110. An-Nahl, Ayah 75.", "Rub 111. An-Nahl, Ayah 90.",
  "Rub 112. An-Nahl, Ayah 111.", "Rub 113. Al-Isra, Ayah 1.", "Rub 114. Al-Isra, Ayah 23.",
  "Rub 115. Al-Isra, Ayah 50.", "Rub 116. Al-Isra, Ayah 70.", "Rub 117. Al-Isra, Ayah 99.",
  "Rub 118. Al-Kahf, Ayah 17.", "Rub 119. Al-Kahf, Ayah 32.", "Rub 120. Al-Kahf, Ayah 51.",
  "Rub 121. Al-Kahf, Ayah 75.", "Rub 122. Al-Kahf, Ayah 99.", "Rub 123. Maryam, Ayah 22.",
  "Rub 124. Maryam, Ayah 59.", "Rub 125. Ta-Ha, Ayah 1.", "Rub 126. Ta-Ha, Ayah 55."
];
const T3_QURAN_S2 = [
  "Rub 127. Ta-Ha, Ayah 83.", "Rub 128. Ta-Ha, Ayah 111.", "Rub 129. Al-Anbiya, Ayah 1.",
  "Rub 130. Al-Anbiya, Ayah 29.", "Rub 131. Al-Anbiya, Ayah 51.", "Rub 132. Al-Anbiya, Ayah 83.",
  "Rub 133. Al-Hajj, Ayah 1.", "Rub 134. Al-Hajj, Ayah 19.", "Rub 135. Al-Hajj, Ayah 38.",
  "Rub 136. Al-Hajj, Ayah 60.", "Rub 137. Al-Mu'minun, Ayah 1.", "Rub 138. Al-Mu'minun, Ayah 36.",
  "Rub 139. Al-Mu'minun, Ayah 75.", "Rub 140. An-Nur, Ayah 1.", "Rub 141. An-Nur, Ayah 21.",
  "Rub 142. An-Nur, Ayah 35.", "Rub 143. An-Nur, Ayah 53.", "Rub 144. Al-Furqan, Ayah 1."
];
const T3_HADITH_S1 = Array(18).fill("Umdat al-Ahkam.");
const T3_HADITH_S2 = Array(18).fill("Umdat al-Ahkam.");
const T3_ARABIC_S1 = Array(18).fill("Nahwul Wadih Primary 3.");
const T3_ARABIC_S2 = Array(18).fill("Nahwul Wadih Primary 3.");
const T3_FIQH_S1 = Array(18).fill("First half of Risala.");
const T3_FIQH_S2 = Array(18).fill("First half of Risala.");
const T3_TAJWEED_S1 = Array(18).fill("Second half of Bidayat al-Talib.");
const T3_TAJWEED_S2 = Array(18).fill("Second half of Bidayat al-Talib.");

const T4_QURAN_S1 = [
  "Rub 73. Al-Anfal, Ayah 41.", "Rub 74. Al-Anfal, Ayah 61.", "Rub 75. At-Tawbah, Ayah 1.",
  "Rub 76. At-Tawbah, Ayah 19.", "Rub 77. At-Tawbah, Ayah 34.", "Rub 78. At-Tawbah, Ayah 46.",
  "Rub 79. At-Tawbah, Ayah 60.", "Rub 80. At-Tawbah, Ayah 75.", "Rub 81. At-Tawbah, Ayah 93.",
  "Rub 82. At-Tawbah, Ayah 111.", "Rub 83. At-Tawbah, Ayah 122.", "Rub 84. Yunus, Ayah 11.",
  "Rub 85. Yunus, Ayah 26.", "Rub 86. Yunus, Ayah 53.", "Rub 87. Yunus, Ayah 71.",
  "Rub 88. Yunus, Ayah 90.", "Rub 89. Hud, Ayah 6.", "Rub 90. Hud, Ayah 24."
];
const T4_QURAN_S2 = [
  "Rub 91. Hud, Ayah 41.", "Rub 92. Hud, Ayah 61.", "Rub 93. Hud, Ayah 84.",
  "Rub 94. Hud, Ayah 108.", "Rub 95. Yusuf, Ayah 7.", "Rub 96. Yusuf, Ayah 30.",
  "Rub 97. Yusuf, Ayah 53.", "Rub 98. Yusuf, Ayah 77.", "Rub 99. Yusuf, Ayah 101.",
  "Rub 100. Ar-Ra'd, Ayah 5.", "Rub 101. Ar-Ra'd, Ayah 19.", "Rub 102. Ar-Ra'd, Ayah 35.",
  "Rub 103. Ibrahim, Ayah 10.", "Rub 104. Ibrahim, Ayah 28.", "Rub 105. Al-Hijr, Ayah 1.",
  "Rub 106. Al-Hijr, Ayah 50.", "Rub 107. An-Nahl, Ayah 1.", "Rub 108. An-Nahl, Ayah 30."
];
const T4_HADITH_S1 = Array(18).fill("Umdat al-Ahkam.");
const T4_HADITH_S2 = Array(18).fill("Umdat al-Ahkam.");
const T4_ARABIC_S1 = Array(18).fill("Nahwul Wadih Primary 4.");
const T4_ARABIC_S2 = Array(18).fill("Nahwul Wadih Primary 4.");
const T4_FIQH_S1 = Array(18).fill("Second half of Risala.");
const T4_FIQH_S2 = Array(18).fill("Second half of Risala.");
const T4_TAJWEED_S1 = Array(18).fill("First half of Bidayat al-Talib.");
const T4_TAJWEED_S2 = Array(18).fill("First half of Bidayat al-Talib.");

const T5_QURAN_S1 = [
  "Rub 37. An-Nisa, Ayah 88.", "Rub 38. An-Nisa, Ayah 100.", "Rub 39. An-Nisa, Ayah 114.",
  "Rub 40. An-Nisa, Ayah 135.", "Rub 41. An-Nisa, Ayah 148.", "Rub 42. An-Nisa, Ayah 163.",
  "Rub 43. Al-Ma'idah, Ayah 1.", "Rub 44. Al-Ma'idah, Ayah 12.", "Rub 45. Al-Ma'idah, Ayah 27.",
  "Rub 46. Al-Ma'idah, Ayah 41.", "Rub 47. Al-Ma'idah, Ayah 51.", "Rub 48. Al-Ma'idah, Ayah 67.",
  "Rub 49. Al-Ma'idah, Ayah 82.", "Rub 50. Al-Ma'idah, Ayah 97.", "Rub 51. Al-Ma'idah, Ayah 109.",
  "Rub 52. Al-An'am, Ayah 13.", "Rub 53. Al-An'am, Ayah 36.", "Rub 54. Al-An'am, Ayah 59."
];
const T5_QURAN_S2 = [
  "Rub 55. Al-An'am, Ayah 74.", "Rub 56. Al-An'am, Ayah 95.", "Rub 57. Al-An'am, Ayah 111.",
  "Rub 58. Al-An'am, Ayah 127.", "Rub 59. Al-An'am, Ayah 141.", "Rub 60. Al-An'am, Ayah 151.",
  "Rub 61. Al-A'raf, Ayah 1.", "Rub 62. Al-A'raf, Ayah 31.", "Rub 63. Al-A'raf, Ayah 47.",
  "Rub 64. Al-A'raf, Ayah 65.", "Rub 65. Al-A'raf, Ayah 88.", "Rub 66. Al-A'raf, Ayah 117.",
  "Rub 67. Al-A'raf, Ayah 142.", "Rub 68. Al-A'raf, Ayah 156.", "Rub 69. Al-A'raf, Ayah 171.",
  "Rub 70. Al-A'raf, Ayah 189.", "Rub 71. Al-Anfal, Ayah 1.", "Rub 72. Al-Anfal, Ayah 22."
];
const T5_HADITH_S1 = Array(18).fill("Umdat al-Ahkam.");
const T5_HADITH_S2 = Array(18).fill("Umdat al-Ahkam.");
const T5_ARABIC_S1 = Array(18).fill("Nahwul Wadih Fifth Year.");
const T5_ARABIC_S2 = Array(18).fill("Nahwul Wadih Fifth Year.");
const T5_FIQH_S1 = Array(18).fill("Third Half of Risala.");
const T5_FIQH_S2 = Array(18).fill("Third Half of Risala.");
const T5_TAJWEED_S1 = Array(18).fill("Repetition of Second Half of Bidayat al-Talib.");
const T5_TAJWEED_S2 = Array(18).fill("Repetition of Second Half of Bidayat al-Talib.");

const T6_QURAN_S1 = [
  "Rub 1. Al-Fatihah, Ayah 1.", "Rub 2. Al-Baqarah, Ayah 26.", "Rub 3. Al-Baqarah, Ayah 44.",
  "Rub 4. Al-Baqarah, Ayah 60.", "Rub 5. Al-Baqarah, Ayah 75.", "Rub 6. Al-Baqarah, Ayah 92.",
  "Rub 7. Al-Baqarah, Ayah 106.", "Rub 8. Al-Baqarah, Ayah 124.", "Rub 9. Al-Baqarah, Ayah 142.",
  "Rub 10. Al-Baqarah, Ayah 158.", "Rub 11. Al-Baqarah, Ayah 177.", "Rub 12. Al-Baqarah, Ayah 189.",
  "Rub 13. Al-Baqarah, Ayah 203.", "Rub 14. Al-Baqarah, Ayah 219.", "Rub 15. Al-Baqarah, Ayah 233.",
  "Rub 16. Al-Baqarah, Ayah 243.", "Rub 17. Al-Baqarah, Ayah 253.", "Rub 18. Al-Baqarah, Ayah 263."
];
const T6_QURAN_S2 = [
  "Rub 19. Al-Baqarah, Ayah 272.", "Rub 20. Al-Baqarah, Ayah 283.", "Rub 21. Ali 'Imran, Ayah 15.",
  "Rub 22. Ali 'Imran, Ayah 33.", "Rub 23. Ali 'Imran, Ayah 52.", "Rub 24. Ali 'Imran, Ayah 75.",
  "Rub 25. Ali 'Imran, Ayah 93.", "Rub 26. Ali 'Imran, Ayah 113.", "Rub 27. Ali 'Imran, Ayah 133.",
  "Rub 28. Ali 'Imran, Ayah 153.", "Rub 29. Ali 'Imran, Ayah 171.", "Rub 30. Ali 'Imran, Ayah 186.",
  "Rub 31. An-Nisa, Ayah 1.", "Rub 32. An-Nisa, Ayah 12.", "Rub 33. An-Nisa, Ayah 24.",
  "Rub 34. An-Nisa, Ayah 36.", "Rub 35. An-Nisa, Ayah 58.", "Rub 36. An-Nisa, Ayah 74."
];
const T6_HADITH_S1 = Array(18).fill("Revision of Umdat al-Ahkam.");
const T6_HADITH_S2 = Array(18).fill("Revision of Umdat al-Ahkam.");
const T6_ARABIC_S1 = Array(18).fill("Nahwul Wadih 6th Year.");
const T6_ARABIC_S2 = Array(18).fill("Nahwul Wadih 6th Year.");
const T6_FIQH_S1 = Array(18).fill("Revision of Risala.");
const T6_FIQH_S2 = Array(18).fill("Revision of Risala.");
const T6_TAJWEED_S1 = Array(18).fill("Complete Revision of Bidayat al-Talib.");
const T6_TAJWEED_S2 = Array(18).fill("Complete Revision of Bidayat al-Talib.");

export const CURRICULUM: Record<string, CurriculumEntry> = {
  "Tamhid": {
    overview: "3 Hizb Qur'an · Hisnul Muslim · Gateway to Arabic 1",
    semester1: { "Qur'an": TAMHID_QURAN_S1, "Hadith": TAMHID_HADITH_S1, "Arabic": TAMHID_ARABIC_S1 },
    semester2: { "Qur'an": TAMHID_QURAN_S2, "Hadith": TAMHID_HADITH_S2, "Arabic": TAMHID_ARABIC_S2 },
  },
  "I'idad": {
    overview: "3 Hizb Qur'an (Juz 30) · Khamsun Hadith · Gateway to Arabic Book 2",
    semester1: { "Qur'an": IIDAD_QURAN_S1, "Hadith": IIDAD_HADITH_S1, "Arabic": IIDAD_ARABIC_S1 },
    semester2: { "Qur'an": IIDAD_QURAN_S2, "Hadith": IIDAD_HADITH_S2, "Arabic": IIDAD_ARABIC_S2 },
  },
  "Thanawiyyah 1": {
    overview: "9 Hizb Qur'an · Miatu Hadith · Nahwul Wadih Primary 1 · Mukhtasar al-Akhdari · Kitabut Tajweed",
    semester1: { "Qur'an": T1_QURAN_S1, "Hadith": T1_HADITH_S1, "Fiqh": T1_FIQH_S1, "Arabic": T1_ARABIC_S1, "Tajweed": T1_TAJWEED_S1 },
    semester2: { "Qur'an": T1_QURAN_S2, "Hadith": T1_HADITH_S2, "Fiqh": T1_FIQH_S2, "Arabic": T1_ARABIC_S2, "Tajweed": T1_TAJWEED_S2 },
  },
  "Thanawiyyah 2": {
    overview: "9 Hizb Qur'an · Arba'una Hadith · Nahwul Wadih Primary 2 · First half of Hallul Masail · Bidayat al-Talib",
    semester1: { "Qur'an": T2_QURAN_S1, "Hadith": T2_HADITH_S1, "Fiqh": T2_FIQH_S1, "Arabic": T2_ARABIC_S1, "Tajweed": T2_TAJWEED_S1 },
    semester2: { "Qur'an": T2_QURAN_S2, "Hadith": T2_HADITH_S2, "Fiqh": T2_FIQH_S2, "Arabic": T2_ARABIC_S2, "Tajweed": T2_TAJWEED_S2 },
  },
  "Thanawiyyah 3": {
    overview: "9 Hizb Qur'an · Umdat al-Ahkam · Nahwul Wadih Primary 3 · First half of Risala · Second half of Bidayat al-Talib",
    semester1: { "Qur'an": T3_QURAN_S1, "Hadith": T3_HADITH_S1, "Fiqh": T3_FIQH_S1, "Arabic": T3_ARABIC_S1, "Tajweed": T3_TAJWEED_S1 },
    semester2: { "Qur'an": T3_QURAN_S2, "Hadith": T3_HADITH_S2, "Fiqh": T3_FIQH_S2, "Arabic": T3_ARABIC_S2, "Tajweed": T3_TAJWEED_S2 },
  },
  "Thanawiyyah 4": {
    overview: "9 Hizb Qur'an · Umdat al-Ahkam · Nahwul Wadih Primary 4 · Second half of Risala · First half of Bidayat al-Talib",
    semester1: { "Qur'an": T4_QURAN_S1, "Hadith": T4_HADITH_S1, "Fiqh": T4_FIQH_S1, "Arabic": T4_ARABIC_S1, "Tajweed": T4_TAJWEED_S1 },
    semester2: { "Qur'an": T4_QURAN_S2, "Hadith": T4_HADITH_S2, "Fiqh": T4_FIQH_S2, "Arabic": T4_ARABIC_S2, "Tajweed": T4_TAJWEED_S2 },
  },
  "Thanawiyyah 5": {
    overview: "9 Hizb Qur'an · Umdat al-Ahkam · Nahwul Wadih Fifth Year · Third Half of Risala · Repetition of Second Half of Bidayat al-Talib",
    semester1: { "Qur'an": T5_QURAN_S1, "Hadith": T5_HADITH_S1, "Fiqh": T5_FIQH_S1, "Arabic": T5_ARABIC_S1, "Tajweed": T5_TAJWEED_S1 },
    semester2: { "Qur'an": T5_QURAN_S2, "Hadith": T5_HADITH_S2, "Fiqh": T5_FIQH_S2, "Arabic": T5_ARABIC_S2, "Tajweed": T5_TAJWEED_S2 },
  },
  "Thanawiyyah 6": {
    overview: "9 Hizb Qur'an · Revision of Umdat al-Ahkam · Nahwul Wadih 6th Year · Revision of Risala · Complete Revision of Bidayat al-Talib",
    semester1: { "Qur'an": T6_QURAN_S1, "Hadith": T6_HADITH_S1, "Fiqh": T6_FIQH_S1, "Arabic": T6_ARABIC_S1, "Tajweed": T6_TAJWEED_S1 },
    semester2: { "Qur'an": T6_QURAN_S2, "Hadith": T6_HADITH_S2, "Fiqh": T6_FIQH_S2, "Arabic": T6_ARABIC_S2, "Tajweed": T6_TAJWEED_S2 },
  },
};
