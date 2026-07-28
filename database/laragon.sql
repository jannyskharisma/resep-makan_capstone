CREATE DATABASE IF NOT EXISTS skripsi_masak
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE skripsi_masak;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ingredients (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nama_bahan VARCHAR(255) NOT NULL,
  kategori VARCHAR(100) NOT NULL,
  status_validasi BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ingredients_nama_bahan (nama_bahan),
  KEY idx_ingredients_status_validasi (status_validasi)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS recipes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  judul_resep VARCHAR(255) NOT NULL,
  porsi_default INT NOT NULL DEFAULT 1,
  langkah_memasak JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_recipes_porsi_default CHECK (porsi_default > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  recipe_id BIGINT UNSIGNED NOT NULL,
  ingredient_id BIGINT UNSIGNED NOT NULL,
  kuantitas DECIMAL(10,2) NOT NULL DEFAULT 1,
  satuan VARCHAR(100) NOT NULL DEFAULT 'secukupnya',
  PRIMARY KEY (recipe_id, ingredient_id),
  KEY idx_recipe_ingredients_recipe_id (recipe_id),
  KEY idx_recipe_ingredients_ingredient_id (ingredient_id),
  CONSTRAINT fk_recipe_ingredients_recipe
    FOREIGN KEY (recipe_id) REFERENCES recipes(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_recipe_ingredients_ingredient
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO users (id, email, password_hash, role)
VALUES
  (1, 'admin@example.com', '$2b$10$fh4Oaxhth3XS0Kv1VI.CZe5NkeYEi0ub8Wj0p/gkrdgsPBhWopJxG', 'admin');

INSERT IGNORE INTO ingredients (id, nama_bahan, kategori, status_validasi)
VALUES
  (1, 'Nasi', 'Karbohidrat', TRUE),
  (2, 'Telur', 'Protein', TRUE),
  (3, 'Ayam', 'Protein', TRUE),
  (4, 'Bawang Merah', 'Bumbu', TRUE),
  (5, 'Bawang Putih', 'Bumbu', TRUE),
  (6, 'Cabai', 'Bumbu', TRUE),
  (7, 'Wortel', 'Sayuran', TRUE),
  (8, 'Bayam', 'Sayuran', TRUE);

INSERT IGNORE INTO recipes (id, judul_resep, porsi_default, langkah_memasak)
VALUES
  (
    1,
    'Nasi Goreng Telur',
    2,
    '[{"instruksi":"Tumis bawang merah, bawang putih, dan cabai sampai harum."},{"instruksi":"Masukkan telur lalu orak-arik sampai matang."},{"instruksi":"Masukkan nasi, aduk rata, lalu koreksi rasa."}]'
  ),
  (
    2,
    'Sup Ayam Wortel',
    3,
    '[{"instruksi":"Rebus ayam sampai keluar kaldu."},{"instruksi":"Masukkan bawang putih dan wortel."},{"instruksi":"Masak sampai wortel empuk, lalu sajikan hangat."}]'
  ),
  (
    3,
    'Tumis Bayam Bawang Putih',
    2,
    '[{"instruksi":"Tumis bawang putih sampai harum."},{"instruksi":"Masukkan bayam dan sedikit air."},{"instruksi":"Masak sebentar sampai bayam layu."}]'
  );

INSERT IGNORE INTO recipe_ingredients (recipe_id, ingredient_id, kuantitas, satuan)
VALUES
  (1, 1, 1, 'piring'),
  (1, 2, 1, 'butir'),
  (1, 4, 2, 'siung'),
  (1, 5, 1, 'siung'),
  (1, 6, 2, 'buah'),
  (2, 3, 250, 'gram'),
  (2, 5, 2, 'siung'),
  (2, 7, 1, 'buah'),
  (3, 5, 2, 'siung'),
  (3, 8, 1, 'ikat');

ALTER TABLE users AUTO_INCREMENT = 2;
ALTER TABLE ingredients AUTO_INCREMENT = 9;
ALTER TABLE recipes AUTO_INCREMENT = 4;
