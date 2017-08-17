-- up
create table users (
  id serial,
  username text unique not null,
  password text
);

---

-- down
drop table if exists users;
