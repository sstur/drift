/**
 * this is a comprehensive list of all the entities chrome recognizes. In the interest of
 * keeping things lean, it's not included in the system config.
 */
/*global app */
/* eslint-disable quote-props */
app.cfg({
  html_entities: {
    'aacute': '\xE1', 'abreve': '\u0103', 'ac': '\u223E', 'acd': '\u223F', 'acirc': '\xE2', 'acute': '\xB4',
    'acy': '\u0430', 'aelig': '\xE6', 'af': '\u2061', 'afr': '\uD835\uDD1E', 'agrave': '\xE0', 'alefsym': '\u2135',
    'aleph': '\u2135', 'alpha': '\u03B1', 'amacr': '\u0101', 'amalg': '\u2A3F', 'amp': '\x26', 'and': '\u2227',
    'andand': '\u2A55', 'andd': '\u2A5C', 'andslope': '\u2A58', 'andv': '\u2A5A', 'ang': '\u2220', 'ange': '\u29A4',
    'angle': '\u2220', 'angmsd': '\u2221', 'angmsdaa': '\u29A8', 'angmsdab': '\u29A9', 'angmsdac': '\u29AA',
    'angmsdad': '\u29AB', 'angmsdae': '\u29AC', 'angmsdaf': '\u29AD', 'angmsdag': '\u29AE', 'angmsdah': '\u29AF',
    'angrt': '\u221F', 'angrtvb': '\u22BE', 'angrtvbd': '\u299D', 'angsph': '\u2222', 'angst': '\xC5', 'angzarr': '\u237C',
    'aogon': '\u0105', 'aopf': '\uD835\uDD52', 'ap': '\u2248', 'apacir': '\u2A6F', 'ape': '\u224A', 'apid': '\u224B',
    'apos': '\x27', 'approx': '\u2248', 'approxeq': '\u224A', 'aring': '\xE5', 'ascr': '\uD835\uDCB6', 'ast': '*',
    'asymp': '\u2248', 'asympeq': '\u224D', 'atilde': '\xE3', 'auml': '\xE4', 'awconint': '\u2233', 'awint': '\u2A11',
    'backcong': '\u224C', 'backepsilon': '\u03F6', 'backprime': '\u2035', 'backsim': '\u223D', 'backsimeq': '\u22CD',
    'barvee': '\u22BD', 'barwed': '\u2305', 'barwedge': '\u2305', 'bbrk': '\u23B5', 'bbrktbrk': '\u23B6',
    'bcong': '\u224C', 'bcy': '\u0431', 'bdquo': '\u201E', 'becaus': '\u2235', 'because': '\u2235', 'bemptyv': '\u29B0',
    'bepsi': '\u03F6', 'bernou': '\u212C', 'beta': '\u03B2', 'beth': '\u2136', 'between': '\u226C', 'bfr': '\uD835\uDD1F',
    'bigcap': '\u22C2', 'bigcirc': '\u25EF', 'bigcup': '\u22C3', 'bigodot': '\u2A00', 'bigoplus': '\u2A01',
    'bigotimes': '\u2A02', 'bigsqcup': '\u2A06', 'bigstar': '\u2605', 'bigtriangledown': '\u25BD', 'bigtriangleup': '\u25B3',
    'biguplus': '\u2A04', 'bigvee': '\u22C1', 'bigwedge': '\u22C0', 'bkarow': '\u290D', 'blacklozenge': '\u29EB',
    'blacksquare': '\u25AA', 'blacktriangle': '\u25B4', 'blacktriangledown': '\u25BE', 'blacktriangleleft': '\u25C2',
    'blacktriangleright': '\u25B8', 'blank': '\u2423', 'blk12': '\u2592', 'blk14': '\u2591', 'blk34': '\u2593',
    'block': '\u2588', 'bne': '\x3D\u20E5', 'bnequiv': '\u2261\u20E5', 'bnot': '\u2310', 'bopf': '\uD835\uDD53',
    'bot': '\u22A5', 'bottom': '\u22A5', 'bowtie': '\u22C8', 'boxbox': '\u29C9', 'boxdl': '\u2510', 'boxdr': '\u250C',
    'boxh': '\u2500', 'boxhd': '\u252C', 'boxhu': '\u2534', 'boxminus': '\u229F', 'boxplus': '\u229E', 'boxtimes': '\u22A0',
    'boxul': '\u2518', 'boxur': '\u2514', 'boxv': '\u2502', 'boxvh': '\u253C', 'boxvl': '\u2524', 'boxvr': '\u251C',
    'bprime': '\u2035', 'breve': '\u02D8', 'brvbar': '\xA6', 'bscr': '\uD835\uDCB7', 'bsemi': '\u204F', 'bsim': '\u223D',
    'bsime': '\u22CD', 'bsol': '\x5C', 'bsolb': '\u29C5', 'bsolhsub': '\u27C8', 'bull': '\u2022', 'bullet': '\u2022',
    'bump': '\u224E', 'bumpe': '\u224F', 'bumpeq': '\u224F', 'cacute': '\u0107', 'cap': '\u2229', 'capand': '\u2A44',
    'capbrcup': '\u2A49', 'capcap': '\u2A4B', 'capcup': '\u2A47', 'capdot': '\u2A40', 'caps': '\u2229\uFE00',
    'caret': '\u2041', 'caron': '\u02C7', 'ccaps': '\u2A4D', 'ccaron': '\u010D', 'ccedil': '\xE7', 'ccirc': '\u0109',
    'ccups': '\u2A4C', 'ccupssm': '\u2A50', 'cdot': '\u010B', 'cedil': '\xB8', 'cemptyv': '\u29B2', 'cent': '\xA2',
    'centerdot': '\xB7', 'cfr': '\uD835\uDD20', 'chcy': '\u0447', 'check': '\u2713', 'checkmark': '\u2713',
    'chi': '\u03C7', 'cir': '\u25CB', 'circ': '\u02C6', 'circeq': '\u2257', 'circlearrowleft': '\u21BA', 'circlearrowright': '\u21BB',
    'circledast': '\u229B', 'circledcirc': '\u229A', 'circleddash': '\u229D', 'cire': '\u2257', 'cirfnint': '\u2A10',
    'cirmid': '\u2AEF', 'cirscir': '\u29C2', 'clubs': '\u2663', 'clubsuit': '\u2663', 'colon': '\x3A', 'colone': '\u2254',
    'coloneq': '\u2254', 'comma': '\x2C', 'commat': '@', 'comp': '\u2201', 'compfn': '\u2218', 'complement': '\u2201',
    'complexes': '\u2102', 'cong': '\u2245', 'congdot': '\u2A6D', 'conint': '\u222E', 'copf': '\uD835\uDD54',
    'coprod': '\u2210', 'copy': '\xA9', 'copysr': '\u2117', 'crarr': '\u21B5', 'cross': '\u2717', 'cscr': '\uD835\uDCB8',
    'csub': '\u2ACF', 'csube': '\u2AD1', 'csup': '\u2AD0', 'csupe': '\u2AD2', 'ctdot': '\u22EF', 'cudarrl': '\u2938',
    'cudarrr': '\u2935', 'cuepr': '\u22DE', 'cuesc': '\u22DF', 'cularr': '\u21B6', 'cularrp': '\u293D', 'cup': '\u222A',
    'cupbrcap': '\u2A48', 'cupcap': '\u2A46', 'cupcup': '\u2A4A', 'cupdot': '\u228D', 'cupor': '\u2A45', 'cups': '\u222A\uFE00',
    'curarr': '\u21B7', 'curarrm': '\u293C', 'curlyeqprec': '\u22DE', 'curlyeqsucc': '\u22DF', 'curlyvee': '\u22CE',
    'curlywedge': '\u22CF', 'curren': '\xA4', 'curvearrowleft': '\u21B6', 'curvearrowright': '\u21B7', 'cuvee': '\u22CE',
    'cuwed': '\u22CF', 'cwconint': '\u2232', 'cwint': '\u2231', 'cylcty': '\u232D', 'dagger': '\u2020', 'daleth': '\u2138',
    'darr': '\u2193', 'dash': '\u2010', 'dashv': '\u22A3', 'dbkarow': '\u290F', 'dblac': '\u02DD', 'dcaron': '\u010F',
    'dcy': '\u0434', 'dd': '\u2146', 'ddagger': '\u2021', 'ddarr': '\u21CA', 'ddotseq': '\u2A77', 'deg': '\xB0',
    'delta': '\u03B4', 'demptyv': '\u29B1', 'dfisht': '\u297F', 'dfr': '\uD835\uDD21', 'dharl': '\u21C3',
    'dharr': '\u21C2', 'diam': '\u22C4', 'diamond': '\u22C4', 'diamondsuit': '\u2666', 'diams': '\u2666',
    'die': '\xA8', 'digamma': '\u03DD', 'disin': '\u22F2', 'div': '\xF7', 'divide': '\xF7', 'divideontimes': '\u22C7',
    'divonx': '\u22C7', 'djcy': '\u0452', 'dlcorn': '\u231E', 'dlcrop': '\u230D', 'dollar': '\x24', 'dopf': '\uD835\uDD55',
    'dot': '\u02D9', 'doteq': '\u2250', 'doteqdot': '\u2251', 'dotminus': '\u2238', 'dotplus': '\u2214', 'dotsquare': '\u22A1',
    'doublebarwedge': '\u2306', 'downarrow': '\u2193', 'downdownarrows': '\u21CA', 'downharpoonleft': '\u21C3',
    'downharpoonright': '\u21C2', 'drbkarow': '\u2910', 'drcorn': '\u231F', 'drcrop': '\u230C', 'dscr': '\uD835\uDCB9',
    'dscy': '\u0455', 'dsol': '\u29F6', 'dstrok': '\u0111', 'dtdot': '\u22F1', 'dtri': '\u25BF', 'dtrif': '\u25BE',
    'duarr': '\u21F5', 'duhar': '\u296F', 'dwangle': '\u29A6', 'dzcy': '\u045F', 'dzigrarr': '\u27FF', 'eacute': '\xE9',
    'easter': '\u2A6E', 'ecaron': '\u011B', 'ecir': '\u2256', 'ecirc': '\xEA', 'ecolon': '\u2255', 'ecy': '\u044D',
    'edot': '\u0117', 'ee': '\u2147', 'efr': '\uD835\uDD22', 'eg': '\u2A9A', 'egrave': '\xE8', 'egs': '\u2A96',
    'egsdot': '\u2A98', 'el': '\u2A99', 'elinters': '\u23E7', 'ell': '\u2113', 'els': '\u2A95', 'elsdot': '\u2A97',
    'emacr': '\u0113', 'empty': '\u2205', 'emptyset': '\u2205', 'emptyv': '\u2205', 'emsp': '\u2003', 'emsp13': '\u2004',
    'emsp14': '\u2005', 'eng': '\u014B', 'ensp': '\u2002', 'eogon': '\u0119', 'eopf': '\uD835\uDD56', 'epar': '\u22D5',
    'eparsl': '\u29E3', 'eplus': '\u2A71', 'epsi': '\u03B5', 'epsilon': '\u03B5', 'epsiv': '\u03F5', 'eqcirc': '\u2256',
    'eqcolon': '\u2255', 'eqsim': '\u2242', 'eqslantgtr': '\u2A96', 'eqslantless': '\u2A95', 'equals': '\x3D',
    'equest': '\u225F', 'equiv': '\u2261', 'eqvparsl': '\u29E5', 'erarr': '\u2971', 'escr': '\u212F', 'esdot': '\u2250',
    'esim': '\u2242', 'eta': '\u03B7', 'eth': '\xF0', 'euml': '\xEB', 'euro': '\u20AC', 'excl': '\x21', 'exist': '\u2203',
    'expectation': '\u2130', 'exponentiale': '\u2147', 'fallingdotseq': '\u2252', 'fcy': '\u0444', 'female': '\u2640',
    'ffilig': '\uFB03', 'fflig': '\uFB00', 'ffllig': '\uFB04', 'ffr': '\uD835\uDD23', 'filig': '\uFB01', 'fjlig': 'fj',
    'flat': '\u266D', 'fllig': '\uFB02', 'fltns': '\u25B1', 'fnof': '\u0192', 'fopf': '\uD835\uDD57', 'forall': '\u2200',
    'fork': '\u22D4', 'forkv': '\u2AD9', 'fpartint': '\u2A0D', 'frac12': '\xBD', 'frac13': '\u2153', 'frac14': '\xBC',
    'frac15': '\u2155', 'frac16': '\u2159', 'frac18': '\u215B', 'frac23': '\u2154', 'frac25': '\u2156', 'frac34': '\xBE',
    'frac35': '\u2157', 'frac38': '\u215C', 'frac45': '\u2158', 'frac56': '\u215A', 'frac58': '\u215D', 'frac78': '\u215E',
    'frasl': '\u2044', 'frown': '\u2322', 'fscr': '\uD835\uDCBB', 'gacute': '\u01F5', 'gamma': '\u03B3', 'gammad': '\u03DD',
    'gap': '\u2A86', 'gbreve': '\u011F', 'gcirc': '\u011D', 'gcy': '\u0433', 'gdot': '\u0121', 'ge': '\u2265',
    'gel': '\u22DB', 'geq': '\u2265', 'geqq': '\u2267', 'geqslant': '\u2A7E', 'ges': '\u2A7E', 'gescc': '\u2AA9',
    'gesdot': '\u2A80', 'gesdoto': '\u2A82', 'gesdotol': '\u2A84', 'gesl': '\u22DB\uFE00', 'gesles': '\u2A94',
    'gfr': '\uD835\uDD24', 'gg': '\u226B', 'ggg': '\u22D9', 'gimel': '\u2137', 'gjcy': '\u0453', 'gl': '\u2277',
    'gla': '\u2AA5', 'glj': '\u2AA4', 'gnap': '\u2A8A', 'gnapprox': '\u2A8A', 'gne': '\u2A88', 'gneq': '\u2A88',
    'gneqq': '\u2269', 'gnsim': '\u22E7', 'gopf': '\uD835\uDD58', 'grave': '\x60', 'gscr': '\u210A', 'gsim': '\u2273',
    'gsime': '\u2A8E', 'gsiml': '\u2A90', 'gt': '\x3E', 'gtcc': '\u2AA7', 'gtcir': '\u2A7A', 'gtdot': '\u22D7',
    'gtquest': '\u2A7C', 'gtrapprox': '\u2A86', 'gtrarr': '\u2978', 'gtrdot': '\u22D7', 'gtreqless': '\u22DB',
    'gtreqqless': '\u2A8C', 'gtrless': '\u2277', 'gtrsim': '\u2273', 'gvertneqq': '\u2269\uFE00', 'hairsp': '\u200A',
    'half': '\xBD', 'hamilt': '\u210B', 'hardcy': '\u044A', 'harr': '\u2194', 'harrcir': '\u2948', 'harrw': '\u21AD',
    'hbar': '\u210F', 'hcirc': '\u0125', 'hearts': '\u2665', 'heartsuit': '\u2665', 'hellip': '\u2026', 'hercon': '\u22B9',
    'hfr': '\uD835\uDD25', 'hksearow': '\u2925', 'hkswarow': '\u2926', 'hoarr': '\u21FF', 'homtht': '\u223B',
    'hookleftarrow': '\u21A9', 'hookrightarrow': '\u21AA', 'hopf': '\uD835\uDD59', 'horbar': '\u2015', 'hscr': '\uD835\uDCBD',
    'hslash': '\u210F', 'hstrok': '\u0127', 'hybull': '\u2043', 'hyphen': '\u2010', 'iacute': '\xED', 'ic': '\u2063',
    'icirc': '\xEE', 'icy': '\u0438', 'iecy': '\u0435', 'iexcl': '\xA1', 'iff': '\u21D4', 'ifr': '\uD835\uDD26',
    'igrave': '\xEC', 'ii': '\u2148', 'iiiint': '\u2A0C', 'iiint': '\u222D', 'iinfin': '\u29DC', 'iiota': '\u2129',
    'ijlig': '\u0133', 'imacr': '\u012B', 'image': '\u2111', 'imagline': '\u2110', 'imagpart': '\u2111', 'imath': '\u0131',
    'imof': '\u22B7', 'imped': '\u01B5', 'in': '\u2208', 'incare': '\u2105', 'infin': '\u221E', 'infintie': '\u29DD',
    'inodot': '\u0131', 'int': '\u222B', 'intcal': '\u22BA', 'integers': '\u2124', 'intercal': '\u22BA', 'intlarhk': '\u2A17',
    'intprod': '\u2A3C', 'iocy': '\u0451', 'iogon': '\u012F', 'iopf': '\uD835\uDD5A', 'iota': '\u03B9', 'iprod': '\u2A3C',
    'iquest': '\xBF', 'iscr': '\uD835\uDCBE', 'isin': '\u2208', 'isindot': '\u22F5', 'isins': '\u22F4', 'isinsv': '\u22F3',
    'isinv': '\u2208', 'it': '\u2062', 'itilde': '\u0129', 'iukcy': '\u0456', 'iuml': '\xEF', 'jcirc': '\u0135',
    'jcy': '\u0439', 'jfr': '\uD835\uDD27', 'jmath': '\u0237', 'jopf': '\uD835\uDD5B', 'jscr': '\uD835\uDCBF',
    'jsercy': '\u0458', 'jukcy': '\u0454', 'kappa': '\u03BA', 'kappav': '\u03F0', 'kcedil': '\u0137', 'kcy': '\u043A',
    'kfr': '\uD835\uDD28', 'kgreen': '\u0138', 'khcy': '\u0445', 'kjcy': '\u045C', 'kopf': '\uD835\uDD5C',
    'kscr': '\uD835\uDCC0', 'lacute': '\u013A', 'laemptyv': '\u29B4', 'lagran': '\u2112', 'lambda': '\u03BB',
    'lang': '\u27E8', 'langd': '\u2991', 'langle': '\u27E8', 'lap': '\u2A85', 'laquo': '\xAB', 'larr': '\u2190',
    'larrb': '\u21E4', 'larrbfs': '\u291F', 'larrfs': '\u291D', 'larrhk': '\u21A9', 'larrlp': '\u21AB', 'larrpl': '\u2939',
    'larrsim': '\u2973', 'larrtl': '\u21A2', 'lat': '\u2AAB', 'latail': '\u2919', 'late': '\u2AAD', 'lates': '\u2AAD\uFE00',
    'lbarr': '\u290C', 'lbbrk': '\u2772', 'lbrace': '\x7B', 'lbrack': '\x5B', 'lbrke': '\u298B', 'lbrksld': '\u298F',
    'lbrkslu': '\u298D', 'lcaron': '\u013E', 'lcedil': '\u013C', 'lceil': '\u2308', 'lcub': '\x7B', 'lcy': '\u043B',
    'ldca': '\u2936', 'ldquo': '\u201C', 'ldquor': '\u201E', 'ldrdhar': '\u2967', 'ldrushar': '\u294B', 'ldsh': '\u21B2',
    'le': '\u2264', 'leftarrow': '\u2190', 'leftarrowtail': '\u21A2', 'leftharpoondown': '\u21BD', 'leftharpoonup': '\u21BC',
    'leftleftarrows': '\u21C7', 'leftrightarrow': '\u2194', 'leftrightarrows': '\u21C6', 'leftrightharpoons': '\u21CB',
    'leftrightsquigarrow': '\u21AD', 'leftthreetimes': '\u22CB', 'leg': '\u22DA', 'leq': '\u2264', 'leqq': '\u2266',
    'leqslant': '\u2A7D', 'les': '\u2A7D', 'lescc': '\u2AA8', 'lesdot': '\u2A7F', 'lesdoto': '\u2A81', 'lesdotor': '\u2A83',
    'lesg': '\u22DA\uFE00', 'lesges': '\u2A93', 'lessapprox': '\u2A85', 'lessdot': '\u22D6', 'lesseqgtr': '\u22DA',
    'lesseqqgtr': '\u2A8B', 'lessgtr': '\u2276', 'lesssim': '\u2272', 'lfisht': '\u297C', 'lfloor': '\u230A',
    'lfr': '\uD835\uDD29', 'lg': '\u2276', 'lhard': '\u21BD', 'lharu': '\u21BC', 'lharul': '\u296A', 'lhblk': '\u2584',
    'ljcy': '\u0459', 'll': '\u226A', 'llarr': '\u21C7', 'llcorner': '\u231E', 'llhard': '\u296B', 'lltri': '\u25FA',
    'lmidot': '\u0140', 'lmoust': '\u23B0', 'lmoustache': '\u23B0', 'lnap': '\u2A89', 'lnapprox': '\u2A89',
    'lne': '\u2A87', 'lneq': '\u2A87', 'lneqq': '\u2268', 'lnsim': '\u22E6', 'loang': '\u27EC', 'loarr': '\u21FD',
    'lobrk': '\u27E6', 'longleftarrow': '\u27F5', 'longleftrightarrow': '\u27F7', 'longmapsto': '\u27FC',
    'longrightarrow': '\u27F6', 'looparrowleft': '\u21AB', 'looparrowright': '\u21AC', 'lopar': '\u2985',
    'lopf': '\uD835\uDD5D', 'loplus': '\u2A2D', 'lotimes': '\u2A34', 'lowast': '\u2217', 'lowbar': '_', 'loz': '\u25CA',
    'lozenge': '\u25CA', 'lozf': '\u29EB', 'lpar': '\x28', 'lparlt': '\u2993', 'lrarr': '\u21C6', 'lrcorner': '\u231F',
    'lrhar': '\u21CB', 'lrhard': '\u296D', 'lrm': '\u200E', 'lrtri': '\u22BF', 'lsaquo': '\u2039', 'lscr': '\uD835\uDCC1',
    'lsh': '\u21B0', 'lsim': '\u2272', 'lsime': '\u2A8D', 'lsimg': '\u2A8F', 'lsqb': '\x5B', 'lsquo': '\u2018',
    'lsquor': '\u201A', 'lstrok': '\u0142', 'lt': '\x3C', 'ltcc': '\u2AA6', 'ltcir': '\u2A79', 'ltdot': '\u22D6',
    'lthree': '\u22CB', 'ltimes': '\u22C9', 'ltlarr': '\u2976', 'ltquest': '\u2A7B', 'ltri': '\u25C3', 'ltrie': '\u22B4',
    'ltrif': '\u25C2', 'lurdshar': '\u294A', 'luruhar': '\u2966', 'lvertneqq': '\u2268\uFE00', 'macr': '\xAF',
    'male': '\u2642', 'malt': '\u2720', 'maltese': '\u2720', 'map': '\u21A6', 'mapsto': '\u21A6', 'mapstodown': '\u21A7',
    'mapstoleft': '\u21A4', 'mapstoup': '\u21A5', 'marker': '\u25AE', 'mcomma': '\u2A29', 'mcy': '\u043C',
    'mdash': '\u2014', 'measuredangle': '\u2221', 'mfr': '\uD835\uDD2A', 'mho': '\u2127', 'micro': '\xB5',
    'mid': '\u2223', 'midast': '*', 'midcir': '\u2AF0', 'middot': '\xB7', 'minus': '\u2212', 'minusb': '\u229F',
    'minusd': '\u2238', 'minusdu': '\u2A2A', 'mlcp': '\u2ADB', 'mldr': '\u2026', 'mnplus': '\u2213', 'models': '\u22A7',
    'mopf': '\uD835\uDD5E', 'mp': '\u2213', 'mscr': '\uD835\uDCC2', 'mstpos': '\u223E', 'mu': '\u03BC', 'multimap': '\u22B8',
    'mumap': '\u22B8', 'nabla': '\u2207', 'nacute': '\u0144', 'nang': '\u2220\u20D2', 'nap': '\u2249', 'napid': '\u224B\u0338',
    'napos': '\u0149', 'napprox': '\u2249', 'natur': '\u266E', 'natural': '\u266E', 'naturals': '\u2115',
    'nbsp': '\xA0', 'nbump': '\u224E\u0338', 'nbumpe': '\u224F\u0338', 'ncap': '\u2A43', 'ncaron': '\u0148',
    'ncedil': '\u0146', 'ncong': '\u2247', 'ncongdot': '\u2A6D\u0338', 'ncup': '\u2A42', 'ncy': '\u043D',
    'ndash': '\u2013', 'ne': '\u2260', 'nearhk': '\u2924', 'nearr': '\u2197', 'nearrow': '\u2197', 'nedot': '\u2250\u0338',
    'nequiv': '\u2262', 'nesear': '\u2928', 'nesim': '\u2242\u0338', 'nexist': '\u2204', 'nexists': '\u2204',
    'nfr': '\uD835\uDD2B', 'nge': '\u2271', 'ngeq': '\u2271', 'ngeqq': '\u2267\u0338', 'ngeqslant': '\u2A7E\u0338',
    'nges': '\u2A7E\u0338', 'ngsim': '\u2275', 'ngt': '\u226F', 'ngtr': '\u226F', 'nharr': '\u21AE', 'nhpar': '\u2AF2',
    'ni': '\u220B', 'nis': '\u22FC', 'nisd': '\u22FA', 'niv': '\u220B', 'njcy': '\u045A', 'nlarr': '\u219A',
    'nldr': '\u2025', 'nle': '\u2270', 'nleftarrow': '\u219A', 'nleftrightarrow': '\u21AE', 'nleq': '\u2270',
    'nleqq': '\u2266\u0338', 'nleqslant': '\u2A7D\u0338', 'nles': '\u2A7D\u0338', 'nless': '\u226E', 'nlsim': '\u2274',
    'nlt': '\u226E', 'nltri': '\u22EA', 'nltrie': '\u22EC', 'nmid': '\u2224', 'nopf': '\uD835\uDD5F', 'not': '\xAC',
    'notcongruent': '\xACcongruent\x3B', 'notcupcap': '\xACcupcap\x3B', 'notdoubleverticalbar': '\xACdoubleverticalbar\x3B',
    'notelement': '\xACelement\x3B', 'notequal': '\xACequal\x3B', 'notequaltilde': '\xACequaltilde\x3B', 'notexists': '\xACexists\x3B',
    'notgreater': '\xACgreater\x3B', 'notgreaterequal': '\xACgreaterequal\x3B', 'notgreaterfullequal': '\xACgreaterfullequal\x3B',
    'notgreatergreater': '\xACgreatergreater\x3B', 'notgreaterless': '\xACgreaterless\x3B', 'notgreaterslantequal': '\xACgreaterslantequal\x3B',
    'notgreatertilde': '\xACgreatertilde\x3B', 'nothumpdownhump': '\xAChumpdownhump\x3B', 'nothumpequal': '\xAChumpequal\x3B',
    'notin': '\u2209', 'notindot': '\u22F5\u0338', 'notine': '\xACine\x3B', 'notinva': '\u2209', 'notinvb': '\u22F7',
    'notinvc': '\u22F6', 'notlefttriangle': '\xAClefttriangle\x3B', 'notlefttrianglebar': '\xAClefttrianglebar\x3B',
    'notlefttriangleequal': '\xAClefttriangleequal\x3B', 'notless': '\xACless\x3B', 'notlessequal': '\xAClessequal\x3B',
    'notlessgreater': '\xAClessgreater\x3B', 'notlessless': '\xAClessless\x3B', 'notlessslantequal': '\xAClessslantequal\x3B',
    'notlesstilde': '\xAClesstilde\x3B', 'notnestedgreatergreater': '\xACnestedgreatergreater\x3B', 'notnestedlessless': '\xACnestedlessless\x3B',
    'notni': '\u220C', 'notniva': '\u220C', 'notnivb': '\u22FE', 'notnivc': '\u22FD', 'notprecedes': '\xACprecedes\x3B',
    'notprecedesequal': '\xACprecedesequal\x3B', 'notprecedesslantequal': '\xACprecedesslantequal\x3B', 'notreverseelement': '\xACreverseelement\x3B',
    'notrighttriangle': '\xACrighttriangle\x3B', 'notrighttrianglebar': '\xACrighttrianglebar\x3B', 'notrighttriangleequal': '\xACrighttriangleequal\x3B',
    'notsquaresubset': '\xACsquaresubset\x3B', 'notsquaresubsetequal': '\xACsquaresubsetequal\x3B', 'notsquaresuperset': '\xACsquaresuperset\x3B',
    'notsquaresupersetequal': '\xACsquaresupersetequal\x3B', 'notsubset': '\xACsubset\x3B', 'notsubsetequal': '\xACsubsetequal\x3B',
    'notsucceeds': '\xACsucceeds\x3B', 'notsucceedsequal': '\xACsucceedsequal\x3B', 'notsucceedsslantequal': '\xACsucceedsslantequal\x3B',
    'notsucceedstilde': '\xACsucceedstilde\x3B', 'notsuperset': '\xACsuperset\x3B', 'notsupersetequal': '\xACsupersetequal\x3B',
    'nottilde': '\xACtilde\x3B', 'nottildeequal': '\xACtildeequal\x3B', 'nottildefullequal': '\xACtildefullequal\x3B',
    'nottildetilde': '\xACtildetilde\x3B', 'notverticalbar': '\xACverticalbar\x3B', 'npar': '\u2226', 'nparallel': '\u2226',
    'nparsl': '\u2AFD\u20E5', 'npart': '\u2202\u0338', 'npolint': '\u2A14', 'npr': '\u2280', 'nprcue': '\u22E0',
    'npre': '\u2AAF\u0338', 'nprec': '\u2280', 'npreceq': '\u2AAF\u0338', 'nrarr': '\u219B', 'nrarrc': '\u2933\u0338',
    'nrarrw': '\u219D\u0338', 'nrightarrow': '\u219B', 'nrtri': '\u22EB', 'nrtrie': '\u22ED', 'nsc': '\u2281',
    'nsccue': '\u22E1', 'nsce': '\u2AB0\u0338', 'nscr': '\uD835\uDCC3', 'nshortmid': '\u2224', 'nshortparallel': '\u2226',
    'nsim': '\u2241', 'nsime': '\u2244', 'nsimeq': '\u2244', 'nsmid': '\u2224', 'nspar': '\u2226', 'nsqsube': '\u22E2',
    'nsqsupe': '\u22E3', 'nsub': '\u2284', 'nsube': '\u2288', 'nsubset': '\u2282\u20D2', 'nsubseteq': '\u2288',
    'nsubseteqq': '\u2AC5\u0338', 'nsucc': '\u2281', 'nsucceq': '\u2AB0\u0338', 'nsup': '\u2285', 'nsupe': '\u2289',
    'nsupset': '\u2283\u20D2', 'nsupseteq': '\u2289', 'nsupseteqq': '\u2AC6\u0338', 'ntgl': '\u2279', 'ntilde': '\xF1',
    'ntlg': '\u2278', 'ntriangleleft': '\u22EA', 'ntrianglelefteq': '\u22EC', 'ntriangleright': '\u22EB',
    'ntrianglerighteq': '\u22ED', 'nu': '\u03BD', 'num': '\x23', 'numero': '\u2116', 'numsp': '\u2007', 'nvap': '\u224D\u20D2',
    'nvdash': '\u22AC', 'nvge': '\u2265\u20D2', 'nvgt': '\x3E\u20D2', 'nvinfin': '\u29DE', 'nvle': '\u2264\u20D2',
    'nvlt': '\x3C\u20D2', 'nvltrie': '\u22B4\u20D2', 'nvrtrie': '\u22B5\u20D2', 'nvsim': '\u223C\u20D2', 'nwarhk': '\u2923',
    'nwarr': '\u2196', 'nwarrow': '\u2196', 'nwnear': '\u2927', 'oacute': '\xF3', 'oast': '\u229B', 'ocir': '\u229A',
    'ocirc': '\xF4', 'ocy': '\u043E', 'odash': '\u229D', 'odblac': '\u0151', 'odiv': '\u2A38', 'odot': '\u2299',
    'odsold': '\u29BC', 'oelig': '\u0153', 'ofcir': '\u29BF', 'ofr': '\uD835\uDD2C', 'ogon': '\u02DB', 'ograve': '\xF2',
    'ogt': '\u29C1', 'ohbar': '\u29B5', 'ohm': '\u03A9', 'oint': '\u222E', 'olarr': '\u21BA', 'olcir': '\u29BE',
    'olcross': '\u29BB', 'oline': '\u203E', 'olt': '\u29C0', 'omacr': '\u014D', 'omega': '\u03C9', 'omicron': '\u03BF',
    'omid': '\u29B6', 'ominus': '\u2296', 'oopf': '\uD835\uDD60', 'opar': '\u29B7', 'operp': '\u29B9', 'oplus': '\u2295',
    'or': '\u2228', 'orarr': '\u21BB', 'ord': '\u2A5D', 'order': '\u2134', 'orderof': '\u2134', 'ordf': '\xAA',
    'ordm': '\xBA', 'origof': '\u22B6', 'oror': '\u2A56', 'orslope': '\u2A57', 'orv': '\u2A5B', 'oscr': '\u2134',
    'oslash': '\xF8', 'osol': '\u2298', 'otilde': '\xF5', 'otimes': '\u2297', 'otimesas': '\u2A36', 'ouml': '\xF6',
    'ovbar': '\u233D', 'par': '\u2225', 'para': '\xB6', 'parallel': '\u2225', 'parsim': '\u2AF3', 'parsl': '\u2AFD',
    'part': '\u2202', 'pcy': '\u043F', 'percnt': '\x25', 'period': '.', 'permil': '\u2030', 'perp': '\u22A5',
    'pertenk': '\u2031', 'pfr': '\uD835\uDD2D', 'phi': '\u03C6', 'phiv': '\u03D5', 'phmmat': '\u2133', 'phone': '\u260E',
    'pi': '\u03C0', 'pitchfork': '\u22D4', 'piv': '\u03D6', 'planck': '\u210F', 'planckh': '\u210E', 'plankv': '\u210F',
    'plus': '+', 'plusacir': '\u2A23', 'plusb': '\u229E', 'pluscir': '\u2A22', 'plusdo': '\u2214', 'plusdu': '\u2A25',
    'pluse': '\u2A72', 'plusmn': '\xB1', 'plussim': '\u2A26', 'plustwo': '\u2A27', 'pm': '\xB1', 'pointint': '\u2A15',
    'popf': '\uD835\uDD61', 'pound': '\xA3', 'pr': '\u227A', 'prap': '\u2AB7', 'prcue': '\u227C', 'pre': '\u2AAF',
    'prec': '\u227A', 'precapprox': '\u2AB7', 'preccurlyeq': '\u227C', 'preceq': '\u2AAF', 'precnapprox': '\u2AB9',
    'precneqq': '\u2AB5', 'precnsim': '\u22E8', 'precsim': '\u227E', 'prime': '\u2032', 'primes': '\u2119',
    'prnap': '\u2AB9', 'prnsim': '\u22E8', 'prod': '\u220F', 'profalar': '\u232E', 'profline': '\u2312', 'profsurf': '\u2313',
    'prop': '\u221D', 'propto': '\u221D', 'prsim': '\u227E', 'prurel': '\u22B0', 'pscr': '\uD835\uDCC5', 'psi': '\u03C8',
    'puncsp': '\u2008', 'qfr': '\uD835\uDD2E', 'qint': '\u2A0C', 'qopf': '\uD835\uDD62', 'qprime': '\u2057',
    'qscr': '\uD835\uDCC6', 'quaternions': '\u210D', 'quatint': '\u2A16', 'quest': '\x3F', 'questeq': '\u225F',
    'quot': '\x22', 'race': '\u223D\u0331', 'racute': '\u0155', 'radic': '\u221A', 'raemptyv': '\u29B3', 'rang': '\u27E9',
    'rangd': '\u2992', 'range': '\u29A5', 'rangle': '\u27E9', 'raquo': '\xBB', 'rarr': '\u2192', 'rarrap': '\u2975',
    'rarrb': '\u21E5', 'rarrbfs': '\u2920', 'rarrc': '\u2933', 'rarrfs': '\u291E', 'rarrhk': '\u21AA', 'rarrlp': '\u21AC',
    'rarrpl': '\u2945', 'rarrsim': '\u2974', 'rarrtl': '\u21A3', 'rarrw': '\u219D', 'ratail': '\u291A', 'ratio': '\u2236',
    'rationals': '\u211A', 'rbarr': '\u290D', 'rbbrk': '\u2773', 'rbrace': '\x7D', 'rbrack': '\x5D', 'rbrke': '\u298C',
    'rbrksld': '\u298E', 'rbrkslu': '\u2990', 'rcaron': '\u0159', 'rcedil': '\u0157', 'rceil': '\u2309', 'rcub': '\x7D',
    'rcy': '\u0440', 'rdca': '\u2937', 'rdldhar': '\u2969', 'rdquo': '\u201D', 'rdquor': '\u201D', 'rdsh': '\u21B3',
    'real': '\u211C', 'realine': '\u211B', 'realpart': '\u211C', 'reals': '\u211D', 'rect': '\u25AD', 'reg': '\xAE',
    'rfisht': '\u297D', 'rfloor': '\u230B', 'rfr': '\uD835\uDD2F', 'rhard': '\u21C1', 'rharu': '\u21C0', 'rharul': '\u296C',
    'rho': '\u03C1', 'rhov': '\u03F1', 'rightarrow': '\u2192', 'rightarrowtail': '\u21A3', 'rightharpoondown': '\u21C1',
    'rightharpoonup': '\u21C0', 'rightleftarrows': '\u21C4', 'rightleftharpoons': '\u21CC', 'rightrightarrows': '\u21C9',
    'rightsquigarrow': '\u219D', 'rightthreetimes': '\u22CC', 'ring': '\u02DA', 'risingdotseq': '\u2253',
    'rlarr': '\u21C4', 'rlhar': '\u21CC', 'rlm': '\u200F', 'rmoust': '\u23B1', 'rmoustache': '\u23B1', 'rnmid': '\u2AEE',
    'roang': '\u27ED', 'roarr': '\u21FE', 'robrk': '\u27E7', 'ropar': '\u2986', 'ropf': '\uD835\uDD63', 'roplus': '\u2A2E',
    'rotimes': '\u2A35', 'rpar': '\x29', 'rpargt': '\u2994', 'rppolint': '\u2A12', 'rrarr': '\u21C9', 'rsaquo': '\u203A',
    'rscr': '\uD835\uDCC7', 'rsh': '\u21B1', 'rsqb': '\x5D', 'rsquo': '\u2019', 'rsquor': '\u2019', 'rthree': '\u22CC',
    'rtimes': '\u22CA', 'rtri': '\u25B9', 'rtrie': '\u22B5', 'rtrif': '\u25B8', 'rtriltri': '\u29CE', 'ruluhar': '\u2968',
    'rx': '\u211E', 'sacute': '\u015B', 'sbquo': '\u201A', 'sc': '\u227B', 'scap': '\u2AB8', 'scaron': '\u0161',
    'sccue': '\u227D', 'sce': '\u2AB0', 'scedil': '\u015F', 'scirc': '\u015D', 'scnap': '\u2ABA', 'scnsim': '\u22E9',
    'scpolint': '\u2A13', 'scsim': '\u227F', 'scy': '\u0441', 'sdot': '\u22C5', 'sdotb': '\u22A1', 'sdote': '\u2A66',
    'searhk': '\u2925', 'searr': '\u2198', 'searrow': '\u2198', 'sect': '\xA7', 'semi': '\x3B', 'seswar': '\u2929',
    'setminus': '\u2216', 'setmn': '\u2216', 'sext': '\u2736', 'sfr': '\uD835\uDD30', 'sfrown': '\u2322',
    'sharp': '\u266F', 'shchcy': '\u0449', 'shcy': '\u0448', 'shortmid': '\u2223', 'shortparallel': '\u2225',
    'shy': '\xAD', 'sigma': '\u03C3', 'sigmaf': '\u03C2', 'sigmav': '\u03C2', 'sim': '\u223C', 'simdot': '\u2A6A',
    'sime': '\u2243', 'simeq': '\u2243', 'simg': '\u2A9E', 'siml': '\u2A9D', 'simne': '\u2246', 'simplus': '\u2A24',
    'simrarr': '\u2972', 'slarr': '\u2190', 'smallsetminus': '\u2216', 'smashp': '\u2A33', 'smeparsl': '\u29E4',
    'smid': '\u2223', 'smile': '\u2323', 'smt': '\u2AAA', 'smte': '\u2AAC', 'smtes': '\u2AAC\uFE00', 'softcy': '\u044C',
    'sol': '/', 'solb': '\u29C4', 'solbar': '\u233F', 'sopf': '\uD835\uDD64', 'spades': '\u2660', 'spadesuit': '\u2660',
    'spar': '\u2225', 'sqcap': '\u2293', 'sqcaps': '\u2293\uFE00', 'sqcup': '\u2294', 'sqcups': '\u2294\uFE00',
    'sqsub': '\u228F', 'sqsube': '\u2291', 'sqsubset': '\u228F', 'sqsubseteq': '\u2291', 'sqsup': '\u2290',
    'sqsupe': '\u2292', 'sqsupset': '\u2290', 'sqsupseteq': '\u2292', 'squ': '\u25A1', 'square': '\u25A1',
    'squarf': '\u25AA', 'squf': '\u25AA', 'srarr': '\u2192', 'sscr': '\uD835\uDCC8', 'ssetmn': '\u2216', 'ssmile': '\u2323',
    'sstarf': '\u22C6', 'star': '\u2606', 'starf': '\u2605', 'straightepsilon': '\u03F5', 'straightphi': '\u03D5',
    'strns': '\xAF', 'sub': '\u2282', 'subdot': '\u2ABD', 'sube': '\u2286', 'subedot': '\u2AC3', 'submult': '\u2AC1',
    'subne': '\u228A', 'subplus': '\u2ABF', 'subrarr': '\u2979', 'subset': '\u2282', 'subseteq': '\u2286',
    'subseteqq': '\u2AC5', 'subsetneq': '\u228A', 'subsetneqq': '\u2ACB', 'subsim': '\u2AC7', 'subsub': '\u2AD5',
    'subsup': '\u2AD3', 'succ': '\u227B', 'succapprox': '\u2AB8', 'succcurlyeq': '\u227D', 'succeq': '\u2AB0',
    'succnapprox': '\u2ABA', 'succneqq': '\u2AB6', 'succnsim': '\u22E9', 'succsim': '\u227F', 'sum': '\u2211',
    'sung': '\u266A', 'sup': '\u2283', 'sup1': '\xB9', 'sup2': '\xB2', 'sup3': '\xB3', 'supdot': '\u2ABE',
    'supdsub': '\u2AD8', 'supe': '\u2287', 'supedot': '\u2AC4', 'suphsol': '\u27C9', 'suphsub': '\u2AD7',
    'suplarr': '\u297B', 'supmult': '\u2AC2', 'supne': '\u228B', 'supplus': '\u2AC0', 'supset': '\u2283',
    'supseteq': '\u2287', 'supseteqq': '\u2AC6', 'supsetneq': '\u228B', 'supsetneqq': '\u2ACC', 'supsim': '\u2AC8',
    'supsub': '\u2AD4', 'supsup': '\u2AD6', 'swarhk': '\u2926', 'swarr': '\u2199', 'swarrow': '\u2199', 'swnwar': '\u292A',
    'szlig': '\xDF', 'target': '\u2316', 'tau': '\u03C4', 'tbrk': '\u23B4', 'tcaron': '\u0165', 'tcedil': '\u0163',
    'tcy': '\u0442', 'tdot': '\u20DB', 'telrec': '\u2315', 'tfr': '\uD835\uDD31', 'there4': '\u2234', 'therefore': '\u2234',
    'theta': '\u03B8', 'thetasym': '\u03D1', 'thetav': '\u03D1', 'thickapprox': '\u2248', 'thicksim': '\u223C',
    'thinsp': '\u2009', 'thkap': '\u2248', 'thksim': '\u223C', 'thorn': '\xFE', 'tilde': '\u02DC', 'times': '\xD7',
    'timesb': '\u22A0', 'timesbar': '\u2A31', 'timesd': '\u2A30', 'tint': '\u222D', 'toea': '\u2928', 'top': '\u22A4',
    'topbot': '\u2336', 'topcir': '\u2AF1', 'topf': '\uD835\uDD65', 'topfork': '\u2ADA', 'tosa': '\u2929',
    'tprime': '\u2034', 'trade': '\u2122', 'triangle': '\u25B5', 'triangledown': '\u25BF', 'triangleleft': '\u25C3',
    'trianglelefteq': '\u22B4', 'triangleq': '\u225C', 'triangleright': '\u25B9', 'trianglerighteq': '\u22B5',
    'tridot': '\u25EC', 'trie': '\u225C', 'triminus': '\u2A3A', 'triplus': '\u2A39', 'trisb': '\u29CD', 'tritime': '\u2A3B',
    'trpezium': '\u23E2', 'tscr': '\uD835\uDCC9', 'tscy': '\u0446', 'tshcy': '\u045B', 'tstrok': '\u0167',
    'twixt': '\u226C', 'twoheadleftarrow': '\u219E', 'twoheadrightarrow': '\u21A0', 'uacute': '\xFA', 'uarr': '\u2191',
    'ubrcy': '\u045E', 'ubreve': '\u016D', 'ucirc': '\xFB', 'ucy': '\u0443', 'udarr': '\u21C5', 'udblac': '\u0171',
    'udhar': '\u296E', 'ufisht': '\u297E', 'ufr': '\uD835\uDD32', 'ugrave': '\xF9', 'uharl': '\u21BF', 'uharr': '\u21BE',
    'uhblk': '\u2580', 'ulcorn': '\u231C', 'ulcorner': '\u231C', 'ulcrop': '\u230F', 'ultri': '\u25F8', 'umacr': '\u016B',
    'uml': '\xA8', 'uogon': '\u0173', 'uopf': '\uD835\uDD66', 'uparrow': '\u2191', 'updownarrow': '\u2195',
    'upharpoonleft': '\u21BF', 'upharpoonright': '\u21BE', 'uplus': '\u228E', 'upsi': '\u03C5', 'upsih': '\u03D2',
    'upsilon': '\u03C5', 'upuparrows': '\u21C8', 'urcorn': '\u231D', 'urcorner': '\u231D', 'urcrop': '\u230E',
    'uring': '\u016F', 'urtri': '\u25F9', 'uscr': '\uD835\uDCCA', 'utdot': '\u22F0', 'utilde': '\u0169', 'utri': '\u25B5',
    'utrif': '\u25B4', 'uuarr': '\u21C8', 'uuml': '\xFC', 'uwangle': '\u29A7', 'vangrt': '\u299C', 'varepsilon': '\u03F5',
    'varkappa': '\u03F0', 'varnothing': '\u2205', 'varphi': '\u03D5', 'varpi': '\u03D6', 'varpropto': '\u221D',
    'varr': '\u2195', 'varrho': '\u03F1', 'varsigma': '\u03C2', 'varsubsetneq': '\u228A\uFE00', 'varsubsetneqq': '\u2ACB\uFE00',
    'varsupsetneq': '\u228B\uFE00', 'varsupsetneqq': '\u2ACC\uFE00', 'vartheta': '\u03D1', 'vartriangleleft': '\u22B2',
    'vartriangleright': '\u22B3', 'vcy': '\u0432', 'vdash': '\u22A2', 'vee': '\u2228', 'veebar': '\u22BB',
    'veeeq': '\u225A', 'vellip': '\u22EE', 'verbar': '\x7C', 'vert': '\x7C', 'vfr': '\uD835\uDD33', 'vltri': '\u22B2',
    'vnsub': '\u2282\u20D2', 'vnsup': '\u2283\u20D2', 'vopf': '\uD835\uDD67', 'vprop': '\u221D', 'vrtri': '\u22B3',
    'vscr': '\uD835\uDCCB', 'vsubne': '\u228A\uFE00', 'vsupne': '\u228B\uFE00', 'vzigzag': '\u299A', 'wcirc': '\u0175',
    'wedbar': '\u2A5F', 'wedge': '\u2227', 'wedgeq': '\u2259', 'weierp': '\u2118', 'wfr': '\uD835\uDD34',
    'wopf': '\uD835\uDD68', 'wp': '\u2118', 'wr': '\u2240', 'wreath': '\u2240', 'wscr': '\uD835\uDCCC', 'xcap': '\u22C2',
    'xcirc': '\u25EF', 'xcup': '\u22C3', 'xdtri': '\u25BD', 'xfr': '\uD835\uDD35', 'xharr': '\u27F7', 'xi': '\u03BE',
    'xlarr': '\u27F5', 'xmap': '\u27FC', 'xnis': '\u22FB', 'xodot': '\u2A00', 'xopf': '\uD835\uDD69', 'xoplus': '\u2A01',
    'xotime': '\u2A02', 'xrarr': '\u27F6', 'xscr': '\uD835\uDCCD', 'xsqcup': '\u2A06', 'xuplus': '\u2A04',
    'xutri': '\u25B3', 'xvee': '\u22C1', 'xwedge': '\u22C0', 'yacute': '\xFD', 'yacy': '\u044F', 'ycirc': '\u0177',
    'ycy': '\u044B', 'yen': '\xA5', 'yfr': '\uD835\uDD36', 'yicy': '\u0457', 'yopf': '\uD835\uDD6A', 'yscr': '\uD835\uDCCE',
    'yucy': '\u044E', 'yuml': '\xFF', 'zacute': '\u017A', 'zcaron': '\u017E', 'zcy': '\u0437', 'zdot': '\u017C',
    'zeetrf': '\u2128', 'zeta': '\u03B6', 'zfr': '\uD835\uDD37', 'zhcy': '\u0436', 'zigrarr': '\u21DD', 'zopf': '\uD835\uDD6B',
    'zscr': '\uD835\uDCCF', 'zwj': '\u200D', 'zwnj': '\u200C'
  }
});
