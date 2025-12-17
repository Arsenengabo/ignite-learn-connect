// Sample schools in Rwanda organized by province and district
export interface School {
  name: string;
  district: string;
  province: string;
}

export const rwandaSchools: School[] = [
  // Kigali City - Gasabo
  { name: "Lycée de Kigali", district: "Gasabo", province: "Kigali City" },
  { name: "Green Hills Academy", district: "Gasabo", province: "Kigali City" },
  { name: "Riviera High School", district: "Gasabo", province: "Kigali City" },
  { name: "École Belge de Kigali", district: "Gasabo", province: "Kigali City" },
  { name: "Kigali International Community School", district: "Gasabo", province: "Kigali City" },
  { name: "Sunrise School", district: "Gasabo", province: "Kigali City" },
  { name: "College Saint André", district: "Gasabo", province: "Kigali City" },
  
  // Kigali City - Kicukiro
  { name: "FAWE Girls School", district: "Kicukiro", province: "Kigali City" },
  { name: "Kicukiro College of Technology", district: "Kicukiro", province: "Kigali City" },
  { name: "Ecole Technique Officielle", district: "Kicukiro", province: "Kigali City" },
  { name: "Kigali Parents School", district: "Kicukiro", province: "Kigali City" },
  
  // Kigali City - Nyarugenge
  { name: "Groupe Scolaire Officiel de Butamwa", district: "Nyarugenge", province: "Kigali City" },
  { name: "Ecole Secondaire Saint Famille", district: "Nyarugenge", province: "Kigali City" },
  { name: "Kigali Independent School", district: "Nyarugenge", province: "Kigali City" },
  
  // Eastern Province
  { name: "Groupe Scolaire Nyamata", district: "Bugesera", province: "Eastern Province" },
  { name: "Lycée de Nyamata", district: "Bugesera", province: "Eastern Province" },
  { name: "Groupe Scolaire Karama", district: "Kayonza", province: "Eastern Province" },
  { name: "College Saint Pierre de Kayonza", district: "Kayonza", province: "Eastern Province" },
  { name: "Groupe Scolaire Gabiro", district: "Gatsibo", province: "Eastern Province" },
  { name: "Nyagatare High School", district: "Nyagatare", province: "Eastern Province" },
  { name: "Groupe Scolaire Nyagatare", district: "Nyagatare", province: "Eastern Province" },
  { name: "Lycée de Rwamagana", district: "Rwamagana", province: "Eastern Province" },
  
  // Northern Province
  { name: "Groupe Scolaire Cyanika", district: "Burera", province: "Northern Province" },
  { name: "Petit Séminaire de Rwesero", district: "Gicumbi", province: "Northern Province" },
  { name: "College du Christ Roi", district: "Musanze", province: "Northern Province" },
  { name: "IPRC Musanze", district: "Musanze", province: "Northern Province" },
  { name: "Groupe Scolaire Shingiro", district: "Musanze", province: "Northern Province" },
  { name: "Ecole Secondaire de Musanze", district: "Musanze", province: "Northern Province" },
  { name: "Groupe Scolaire Gakenke", district: "Gakenke", province: "Northern Province" },
  
  // Southern Province
  { name: "Groupe Scolaire Officiel de Butare", district: "Huye", province: "Southern Province" },
  { name: "Lycée Notre Dame de Cîteaux", district: "Huye", province: "Southern Province" },
  { name: "College Christ Roi", district: "Huye", province: "Southern Province" },
  { name: "ENDP Gitarama", district: "Muhanga", province: "Southern Province" },
  { name: "Groupe Scolaire St Joseph Kabgayi", district: "Muhanga", province: "Southern Province" },
  { name: "College Saint André de Nyamirambo", district: "Nyanza", province: "Southern Province" },
  { name: "Groupe Scolaire Save", district: "Gisagara", province: "Southern Province" },
  
  // Western Province
  { name: "Groupe Scolaire Notre Dame de Lourdes", district: "Karongi", province: "Western Province" },
  { name: "Collège Saint Pierre de Kibuye", district: "Karongi", province: "Western Province" },
  { name: "Lycée de Rubavu", district: "Rubavu", province: "Western Province" },
  { name: "Sonrise School Rubavu", district: "Rubavu", province: "Western Province" },
  { name: "Groupe Scolaire Gisenyi", district: "Rubavu", province: "Western Province" },
  { name: "College Regina Pacis Rusizi", district: "Rusizi", province: "Western Province" },
  { name: "Groupe Scolaire Nyamasheke", district: "Nyamasheke", province: "Western Province" },
  
  // Universities
  { name: "University of Rwanda - College of Science and Technology", district: "Kicukiro", province: "Kigali City" },
  { name: "University of Rwanda - College of Business and Economics", district: "Gasabo", province: "Kigali City" },
  { name: "University of Rwanda - College of Education", district: "Gasabo", province: "Kigali City" },
  { name: "University of Rwanda - College of Medicine and Health Sciences", district: "Huye", province: "Southern Province" },
  { name: "University of Rwanda - Huye Campus", district: "Huye", province: "Southern Province" },
  { name: "University of Rwanda - Musanze Campus", district: "Musanze", province: "Northern Province" },
  { name: "University of Rwanda - Nyagatare Campus", district: "Nyagatare", province: "Eastern Province" },
  { name: "African Leadership University", district: "Gasabo", province: "Kigali City" },
  { name: "Carnegie Mellon University Africa", district: "Gasabo", province: "Kigali City" },
  { name: "AUCA (Adventist University of Central Africa)", district: "Gasabo", province: "Kigali City" },
  { name: "Mount Kenya University Rwanda", district: "Gasabo", province: "Kigali City" },
  { name: "Kepler", district: "Gasabo", province: "Kigali City" },
  { name: "University of Global Health Equity", district: "Burera", province: "Northern Province" }
];

export function getSchoolsByLocation(province?: string, district?: string): School[] {
  let filtered = rwandaSchools;
  
  if (province) {
    filtered = filtered.filter(school => school.province === province);
  }
  
  if (district) {
    filtered = filtered.filter(school => school.district === district);
  }
  
  return filtered.sort((a, b) => a.name.localeCompare(b.name));
}
