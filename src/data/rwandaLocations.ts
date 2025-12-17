// Rwanda administrative divisions - Provinces and Districts
export const rwandaProvinces = [
  "Kigali City",
  "Eastern Province",
  "Northern Province",
  "Southern Province",
  "Western Province"
] as const;

export type Province = typeof rwandaProvinces[number];

export const rwandaDistricts: Record<Province, string[]> = {
  "Kigali City": [
    "Gasabo",
    "Kicukiro",
    "Nyarugenge"
  ],
  "Eastern Province": [
    "Bugesera",
    "Gatsibo",
    "Kayonza",
    "Kirehe",
    "Ngoma",
    "Nyagatare",
    "Rwamagana"
  ],
  "Northern Province": [
    "Burera",
    "Gakenke",
    "Gicumbi",
    "Musanze",
    "Rulindo"
  ],
  "Southern Province": [
    "Gisagara",
    "Huye",
    "Kamonyi",
    "Muhanga",
    "Nyamagabe",
    "Nyanza",
    "Nyaruguru",
    "Ruhango"
  ],
  "Western Province": [
    "Karongi",
    "Ngororero",
    "Nyabihu",
    "Nyamasheke",
    "Rubavu",
    "Rusizi",
    "Rutsiro"
  ]
};

export const educationLevels = [
  "Primary",
  "Secondary",
  "University"
] as const;

export const subjects = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "French",
  "Kinyarwanda",
  "History",
  "Geography",
  "Economics",
  "Entrepreneurship",
  "Computer Science",
  "ICT",
  "Music",
  "Art",
  "Physical Education",
  "Religion",
  "Agriculture",
  "Home Science"
] as const;
