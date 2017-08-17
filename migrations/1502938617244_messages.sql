-- up
create table messages (
  id serial,
  username text,
  message text,
  time timestamp
);

---

-- down
drop table messages;
