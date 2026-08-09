declare module 'bcryptjs' {
  export function hash(value: string, rounds: number): Promise<string>;
  export function compare(value: string, hash: string): Promise<boolean>;
  export function hashSync(value: string, rounds: number): string;
  export function compareSync(value: string, hash: string): boolean;

  const bcrypt: {
    hash: typeof hash;
    compare: typeof compare;
    hashSync: typeof hashSync;
    compareSync: typeof compareSync;
  };

  export default bcrypt;
}
