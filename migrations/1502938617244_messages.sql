-- up
create table messages (
  id serial,
  username text,
  message text,
  time text
);

---

-- down
drop table messages;
