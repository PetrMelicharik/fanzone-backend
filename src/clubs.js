// Seznam klubů Chance ligy (česká fotbalová první liga)
const clubs = [
  { slug: 'slavia-praha',      name: 'SK Slavia Praha',        city: 'Praha',               abbr: 'SLA', color: '#CC0000', keywords: ['Slavia', 'SK Slavia', 'Slavia Praha'] },
  { slug: 'sparta-praha',      name: 'AC Sparta Praha',        city: 'Praha',               abbr: 'SPA', color: '#AC1A2F', keywords: ['Sparta', 'AC Sparta', 'Sparta Praha'] },
  { slug: 'viktoria-plzen',    name: 'FC Viktoria Plzeň',      city: 'Plzeň',               abbr: 'PLZ', color: '#003087', keywords: ['Plzeň', 'Viktoria Plzeň', 'Viktoria Plzen'] },
  { slug: 'banik-ostrava',     name: 'FC Baník Ostrava',       city: 'Ostrava',             abbr: 'BAO', color: '#005CA9', keywords: ['Baník', 'Baník Ostrava', 'Banik Ostrava'] },
  { slug: 'sigma-olomouc',     name: 'SK Sigma Olomouc',       city: 'Olomouc',             abbr: 'OLO', color: '#003366', keywords: ['Sigma', 'Sigma Olomouc', 'SK Sigma'] },
  { slug: 'bohemians-1905',    name: 'Bohemians Praha 1905',   city: 'Praha',               abbr: 'BOH', color: '#009900', keywords: ['Bohemians', 'Bohemians 1905', 'Bohemka'] },
  { slug: 'slovan-liberec',    name: 'FC Slovan Liberec',      city: 'Liberec',             abbr: 'LIB', color: '#003DA5', keywords: ['Liberec', 'Slovan Liberec', 'FC Liberec'] },
  { slug: 'slovacko',          name: 'FC Slovácko',            city: 'Uherské Hradiště',    abbr: 'SLO', color: '#CC6600', keywords: ['Slovácko', 'FC Slovácko', 'Slovacko'] },
  { slug: 'mlada-boleslav',    name: 'FK Mladá Boleslav',      city: 'Mladá Boleslav',      abbr: 'MLB', color: '#005BAC', keywords: ['Mladá Boleslav', 'Mlada Boleslav', 'FK Boleslav'] },
  { slug: 'jablonec',         name: 'FK Jablonec',            city: 'Jablonec nad Nisou',  abbr: 'JAB', color: '#F7A600', keywords: ['Jablonec', 'FK Jablonec'] },
  { slug: 'teplice',           name: 'FK Teplice',             city: 'Teplice',             abbr: 'TEP', color: '#FFCC00', keywords: ['Teplice', 'FK Teplice'] },
  { slug: 'karvina',           name: 'MFK Karviná',            city: 'Karviná',             abbr: 'KAR', color: '#00529B', keywords: ['Karviná', 'MFK Karviná', 'Karvina'] },
  { slug: 'hradec-kralove',    name: 'FC Hradec Králové',      city: 'Hradec Králové',      abbr: 'HRA', color: '#CC0000', keywords: ['Hradec Králové', 'Hradec Kralove', 'FC Hradec'] },
  { slug: 'ceske-budejovice',  name: 'SK Dynamo Č. Budějovice', city: 'České Budějovice',  abbr: 'DYN', color: '#000000', keywords: ['Dynamo', 'České Budějovice', 'Ceske Budejovice', 'Dynamo Budějovice'] },
  { slug: 'zizkov',            name: 'FK Viktoria Žižkov',     city: 'Praha',               abbr: 'ZIZ', color: '#8B0000', keywords: ['Žižkov', 'Viktoria Žižkov', 'Zizkov'] },
  { slug: 'dukla-praha',       name: 'FK Dukla Praha',         city: 'Praha',               abbr: 'DUK', color: '#FFD700', keywords: ['Dukla', 'Dukla Praha', 'FK Dukla'] },
];

module.exports = clubs;
