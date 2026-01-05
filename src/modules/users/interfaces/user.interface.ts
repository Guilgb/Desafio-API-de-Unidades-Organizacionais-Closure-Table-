export interface IUser {
  id: string;
  type: string;
  name: string;
  email: string;
}

export interface IUserOrganization {
  id: string;
  name: string;
  depth: number;
}
