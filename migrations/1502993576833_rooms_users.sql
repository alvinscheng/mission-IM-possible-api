-- up
create table rooms_users (
  room_id integer,
  username text
);

---

-- down
drop table if exists rooms_users;
