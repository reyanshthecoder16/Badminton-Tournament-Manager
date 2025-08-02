-- 1. Create table
CREATE TABLE PlayerRatingSnapshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  playerId   INT NOT NULL,
  matchDayId INT NOT NULL,
  rating     INT NOT NULL,
  createdAt  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- 2. Unique snapshot per player per day
  UNIQUE KEY uniq_player_day_snapshot (playerId, matchDayId),
  
  -- 3. Foreign-key constraints (adjust table / column names if they differ)
  CONSTRAINT fk_snapshot_player
    FOREIGN KEY (playerId)   REFERENCES Players(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_snapshot_matchday
    FOREIGN KEY (matchDayId) REFERENCES MatchDays(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- If you ever need to roll back:
-- DROP TABLE PlayerRatingSnapshots;