export type Geometry = {
  date: string;         
  type: string;         
  coordinates: any;     
};

export type Source = {
  id?: string;
  url?: string;
};

export type EonetEvent = {
  id: string;
  title: string;
  description?: string | null;
  categories: { id: string; title: string }[];
  sources: Source[];
  geometries: Geometry[];
  closed?: string | null;
};