export const AUTH_CONSTANTS = {
  PASSWORD_SALT_ROUNDS: 10,
} as const;

export const DEFAULT_DBML = `
Table users {
  id integer [primary key]
  username varchar [not null]
  email varchar [unique, not null]
  created_at timestamp
}

Table posts {
  id integer [primary key]
  title varchar [not null]
  body text
  user_id integer
  created_at timestamp
}

Ref: posts.user_id > users.id
`;

