-- Braille Semantic Kernel Tables
-- Stores the mapping between semantic invariants and Braille tokens

-- Braille tokens: The symbolic vocabulary
CREATE TABLE IF NOT EXISTS braille_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  braille VARCHAR(4) NOT NULL UNIQUE, -- Unicode Braille character
  concept_id INT NOT NULL,
  grade INT NOT NULL, -- 0=atomic, 1=compound, 2=meta-cognitive, 3+=emergent
  definition TEXT NOT NULL,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used TIMESTAMP NULL,
  FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE CASCADE,
  INDEX idx_grade (grade),
  INDEX idx_usage (usage_count DESC)
);

-- Kernel generations: Track evolution of the symbolic vocabulary
CREATE TABLE IF NOT EXISTS kernel_generations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  generation INT NOT NULL UNIQUE,
  token_count INT NOT NULL,
  avg_density DECIMAL(5,2) NOT NULL,
  scl_export LONGTEXT, -- Full SCL format export
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_generation (generation DESC)
);

-- Kernel usage log: Track when and how Braille tokens are used
CREATE TABLE IF NOT EXISTS kernel_usage_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  token_id INT NOT NULL,
  context VARCHAR(50) NOT NULL, -- 'meta_controller', 'user_query', etc.
  message_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (token_id) REFERENCES braille_tokens(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL,
  INDEX idx_token (token_id),
  INDEX idx_created (created_at DESC)
);
