export interface Major {
    name: string;
    nimPrefix: string;
}

export interface Faculty {
    name: string;
    majors: Major[];
}

export const FACULTIES: Faculty[] = [
    {
        name: "FMIPA",
        majors: [
            { name: "Matematika", nimPrefix: "101" },
            { name: "Fisika", nimPrefix: "102" },
            { name: "Astronomi", nimPrefix: "103" },
            { name: "Kimia", nimPrefix: "105" },
            { name: "Aktuaria", nimPrefix: "108" },
            { name: "TPB", nimPrefix: "160" },
        ],
    },
    {
        name: "SITH-S",
        majors: [
            { name: "TPB", nimPrefix: "161" },
            { name: "Mikrobiologi", nimPrefix: "104" },
            { name: "Biologi", nimPrefix: "106" },
        ],
    },
    {
        name: "SITH-R",
        majors: [
            { name: "TPB", nimPrefix: "198" },
            { name: "Rekayasa Hayati", nimPrefix: "112" },
            { name: "Rekayasa Pertanian", nimPrefix: "114" },
            { name: "Rekayasa Kehutanan", nimPrefix: "115" },
            { name: "Teknologi Pasca Panen", nimPrefix: "119" },
        ],
    },
    {
        name: "SF",
        majors: [
            { name: "Sains dan Teknologi Farmasi", nimPrefix: "107" },
            { name: "Farmasi Klinik dan Komunitas", nimPrefix: "116" },
            { name: "TPB", nimPrefix: "162" },
        ],
    },
    {
        name: "FTTM",
        majors: [
            { name: "Teknik Pertambangan", nimPrefix: "121" },
            { name: "Teknik Perminyakan", nimPrefix: "122" },
            { name: "Teknik Geofisika", nimPrefix: "123" },
            { name: "Teknik Metalurgi", nimPrefix: "125" },
            { name: "TPB", nimPrefix: "164" },
        ],
    },
    {
        name: "FITB",
        majors: [
            { name: "Teknik Geologi", nimPrefix: "120" },
            { name: "Meteorologi", nimPrefix: "128" },
            { name: "Oseanografi", nimPrefix: "129" },
            { name: "Teknik Geodesi dan Geomatika", nimPrefix: "151" },
            { name: "TPB", nimPrefix: "163" },
        ],
    },
    {
        name: "FTI",
        majors: [
            { name: "Teknik Kimia", nimPrefix: "130" },
            { name: "Teknik Fisika", nimPrefix: "133" },
            { name: "Teknik Industri", nimPrefix: "134" },
            { name: "Teknik Pangan", nimPrefix: "143" },
            { name: "Manajemen Rekayasa", nimPrefix: "144" },
            { name: "Teknik Bioenergi dan Kemurgi", nimPrefix: "145" },
            { name: "Teknik Industri Cirebon", nimPrefix: "194" },
            { name: "TPB", nimPrefix: "167" },
        ],
    },
    {
        name: "STEI-R",
        majors: [
            { name: "Teknik Elektro", nimPrefix: "132" },
            { name: "Teknik Tenaga Listrik", nimPrefix: "180" },
            { name: "Teknik Telekomunikasi", nimPrefix: "181" },
            { name: "Teknik Biomedis", nimPrefix: "183" },
            { name: "TPB", nimPrefix: "165" },
        ],
    },
    {
        name: "STEI-K", // Separated based heavily implied context from user list "STEIK"
        majors: [
            { name: "Teknik Informatika", nimPrefix: "135" },
            { name: "Sistem dan Teknologi Informasi", nimPrefix: "182" },
            { name: "TPB", nimPrefix: "196" },
        ],
    },
    {
        name: "FTMD",
        majors: [
            { name: "Teknik Mesin", nimPrefix: "131" },
            { name: "Teknik Dirgantara", nimPrefix: "136" },
            { name: "Teknik Material", nimPrefix: "137" },
            { name: "TPB", nimPrefix: "169" },
        ],
    },
    {
        name: "FTSL",
        majors: [
            { name: "Teknik Sipil", nimPrefix: "150" },
            { name: "Teknik Lingkungan", nimPrefix: "153" },
            { name: "Teknik Kelautan", nimPrefix: "155" },
            { name: "Rekayasa Infrastruktur Lingkungan", nimPrefix: "157" },
            { name: "Teknik dan Pengelolaan Sumber Daya Air", nimPrefix: "158" },
            { name: "TPB", nimPrefix: "166" },
        ],
    },
    {
        name: "SAPPK",
        majors: [
            { name: "Arsitektur", nimPrefix: "152" },
            { name: "Perencanaan Wilayah dan Kota", nimPrefix: "154" },
            { name: "Perencanaan Wilayah dan Kota Cirebon", nimPrefix: "156" },
            { name: "TPB", nimPrefix: "199" },
        ],
    },
    {
        name: "FSRD",
        majors: [
            { name: "Seni Rupa", nimPrefix: "170" },
            { name: "Kriya Cirebon", nimPrefix: "171" },
            { name: "Kriya", nimPrefix: "172" },
            { name: "Desain Interior", nimPrefix: "173" },
            { name: "Desain Komunikasi Visual", nimPrefix: "174" },
            { name: "Desain Produk", nimPrefix: "175" },
            { name: "TPB", nimPrefix: "168" },
        ],
    },
    {
        name: "SBM",
        majors: [
            { name: "Manajemen", nimPrefix: "190" },
            { name: "Kewirausahaan", nimPrefix: "192" },
            { name: "TPB", nimPrefix: "197" },
        ],
    },
];
