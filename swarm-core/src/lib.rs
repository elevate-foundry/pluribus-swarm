//! Swarm Core - High-performance particle swarm substrate
//! 
//! This is the computational heart of the Pluribus Swarm visualization.
//! All particle physics, text coordinate generation, and field computations
//! happen here in Rust, then get rendered by the JS layer.

use wasm_bindgen::prelude::*;
use rand::Rng;

/// Particle types with different behavioral characteristics
#[wasm_bindgen]
#[derive(Clone, Copy, PartialEq)]
pub enum ParticleType {
    Scout,   // Fast, reactive, small
    Anchor,  // Medium speed, persistent
    Drifter, // Slow, low attraction, large
}

/// A single particle in the swarm
#[derive(Clone)]
struct Particle {
    x: f32,
    y: f32,
    vx: f32,
    vy: f32,
    target_x: f32,
    target_y: f32,
    is_forming: bool,
    size: f32,
    friction: f32,
    ease: f32,
    max_speed: f32,
    attraction_strength: f32,
    particle_type: ParticleType,
}

/// The swarm substrate - manages all particles and their physics
#[wasm_bindgen]
pub struct SwarmSubstrate {
    particles: Vec<Particle>,
    text_coords: Vec<(f32, f32)>,
    render_buffer: Vec<f32>,  // Pre-allocated buffer for render data
    width: f32,
    height: f32,
    mouse_x: f32,
    mouse_y: f32,
    mouse_active: bool,
    time: f32,
}

#[wasm_bindgen]
impl SwarmSubstrate {
    /// Create a new swarm substrate
    #[wasm_bindgen(constructor)]
    pub fn new(width: f32, height: f32, particle_count: usize) -> SwarmSubstrate {
        let mut rng = rand::thread_rng();
        let mut particles = Vec::with_capacity(particle_count);
        
        for _ in 0..particle_count {
            let rand_type: f32 = rng.gen();
            let (particle_type, max_speed, attraction_strength, size, friction, ease) = 
                if rand_type < 0.6 {
                    // Scout: 60%
                    (ParticleType::Scout, 6.0, 1.5, rng.gen::<f32>() * 1.0 + 0.5, 
                     0.92 + rng.gen::<f32>() * 0.04, 0.12 + rng.gen::<f32>() * 0.06)
                } else if rand_type < 0.85 {
                    // Anchor: 25%
                    (ParticleType::Anchor, 4.0, 1.8, rng.gen::<f32>() * 1.5 + 1.0,
                     0.94 + rng.gen::<f32>() * 0.03, 0.08 + rng.gen::<f32>() * 0.04)
                } else {
                    // Drifter: 15%
                    (ParticleType::Drifter, 5.0, 0.8, rng.gen::<f32>() * 2.0 + 1.2,
                     0.92 + rng.gen::<f32>() * 0.05, 0.10 + rng.gen::<f32>() * 0.05)
                };
            
            let x = rng.gen::<f32>() * width;
            let y = rng.gen::<f32>() * height;
            
            particles.push(Particle {
                x,
                y,
                vx: (rng.gen::<f32>() - 0.5) * 2.0,
                vy: (rng.gen::<f32>() - 0.5) * 2.0,
                target_x: x,
                target_y: y,
                is_forming: false,
                size,
                friction,
                ease,
                max_speed,
                attraction_strength,
                particle_type,
            });
        }
        
        let render_buffer = vec![0.0f32; particle_count * 4];
        
        SwarmSubstrate {
            particles,
            text_coords: Vec::new(),
            render_buffer,
            width,
            height,
            mouse_x: 0.0,
            mouse_y: 0.0,
            mouse_active: false,
            time: 0.0,
        }
    }
    
    /// Set text coordinates from JS (flattened array: [x1, y1, x2, y2, ...])
    #[wasm_bindgen]
    pub fn set_text_coords(&mut self, coords: &[f32]) {
        self.text_coords.clear();
        for chunk in coords.chunks(2) {
            if chunk.len() == 2 {
                self.text_coords.push((chunk[0], chunk[1]));
            }
        }
        self.assign_particles_to_text();
    }
    
    /// Assign particles to text coordinates using nearest-neighbor matching
    fn assign_particles_to_text(&mut self) {
        let num_coords = self.text_coords.len();
        if num_coords == 0 {
            // No text - all particles float
            for p in &mut self.particles {
                p.is_forming = false;
            }
            return;
        }
        
        // Grid-based nearest neighbor for O(n) instead of O(n²)
        let grid_size: f32 = 50.0;
        let mut grid: std::collections::HashMap<(i32, i32), Vec<usize>> = 
            std::collections::HashMap::new();
        
        for (idx, &(x, y)) in self.text_coords.iter().enumerate() {
            let key = ((x / grid_size) as i32, (y / grid_size) as i32);
            grid.entry(key).or_insert_with(Vec::new).push(idx);
        }
        
        let mut used_coords: std::collections::HashSet<usize> = 
            std::collections::HashSet::new();
        let num_to_assign = self.particles.len().min(num_coords);
        
        // First pass: assign particles to nearby targets
        for i in 0..self.particles.len() {
            if i >= num_to_assign {
                self.particles[i].is_forming = false;
                continue;
            }
            
            let p = &self.particles[i];
            let gx = (p.x / grid_size) as i32;
            let gy = (p.y / grid_size) as i32;
            
            let mut best_dist = f32::INFINITY;
            let mut best_idx: Option<usize> = None;
            
            // Search nearby grid cells
            for dx in -2..=2 {
                for dy in -2..=2 {
                    if let Some(cell) = grid.get(&(gx + dx, gy + dy)) {
                        for &coord_idx in cell {
                            if used_coords.contains(&coord_idx) {
                                continue;
                            }
                            let (cx, cy) = self.text_coords[coord_idx];
                            let dist = (p.x - cx).powi(2) + (p.y - cy).powi(2);
                            if dist < best_dist {
                                best_dist = dist;
                                best_idx = Some(coord_idx);
                            }
                        }
                    }
                }
            }
            
            if let Some(idx) = best_idx {
                let (tx, ty) = self.text_coords[idx];
                self.particles[i].target_x = tx;
                self.particles[i].target_y = ty;
                self.particles[i].is_forming = true;
                used_coords.insert(idx);
            }
        }
        
        // Second pass: assign remaining particles to any unused coords
        let mut unused_idx = 0;
        for i in 0..self.particles.len() {
            if self.particles[i].is_forming || i >= num_to_assign {
                continue;
            }
            
            while unused_idx < num_coords && used_coords.contains(&unused_idx) {
                unused_idx += 1;
            }
            
            if unused_idx < num_coords {
                let (tx, ty) = self.text_coords[unused_idx];
                self.particles[i].target_x = tx;
                self.particles[i].target_y = ty;
                self.particles[i].is_forming = true;
                used_coords.insert(unused_idx);
                unused_idx += 1;
            } else {
                self.particles[i].is_forming = false;
            }
        }
    }
    
    /// Update mouse position
    #[wasm_bindgen]
    pub fn set_mouse(&mut self, x: f32, y: f32, active: bool) {
        self.mouse_x = x;
        self.mouse_y = y;
        self.mouse_active = active;
    }
    
    /// Resize the substrate
    #[wasm_bindgen]
    pub fn resize(&mut self, width: f32, height: f32) {
        self.width = width;
        self.height = height;
    }
    
    /// Step the simulation forward one frame
    #[wasm_bindgen]
    pub fn step(&mut self) {
        self.time += 0.02;
        let mouse_radius: f32 = 150.0;
        
        for p in &mut self.particles {
            // Mouse repulsion
            let mut force_x: f32 = 0.0;
            let mut force_y: f32 = 0.0;
            
            if self.mouse_active {
                let mdx = self.mouse_x - p.x;
                let mdy = self.mouse_y - p.y;
                let dist = (mdx * mdx + mdy * mdy).sqrt();
                
                if dist < mouse_radius && dist > 0.0 {
                    let force = (mouse_radius - dist) / mouse_radius;
                    let angle = mdy.atan2(mdx);
                    force_x = -angle.cos() * force * 5.0;
                    force_y = -angle.sin() * force * 5.0;
                }
            }
            
            // Physics update
            if p.is_forming {
                // Breathing effect
                let breathing = (self.time + p.y * 0.05).sin() * 2.0;
                let target_x = p.target_x + breathing;
                let target_y = p.target_y + breathing;
                
                let ddx = target_x - p.x;
                let ddy = target_y - p.y;
                
                // Move towards target
                p.vx += (ddx * p.ease * p.attraction_strength + force_x) * 0.1;
                p.vy += (ddy * p.ease * p.attraction_strength + force_y) * 0.1;
            } else {
                // Float randomly
                p.vx += force_x * 0.5;
                p.vy += force_y * 0.5;
                
                // Boundary bounce
                if p.x < 0.0 || p.x > self.width {
                    p.vx *= -1.0;
                }
                if p.y < 0.0 || p.y > self.height {
                    p.vy *= -1.0;
                }
            }
            
            // Apply friction
            p.vx *= p.friction;
            p.vy *= p.friction;
            
            // Clamp velocity
            let speed = (p.vx * p.vx + p.vy * p.vy).sqrt();
            if speed > p.max_speed {
                p.vx = (p.vx / speed) * p.max_speed;
                p.vy = (p.vy / speed) * p.max_speed;
            }
            
            // Update position
            p.x += p.vx;
            p.y += p.vy;
        }
    }
    
    /// Get particle count
    #[wasm_bindgen]
    pub fn particle_count(&self) -> usize {
        self.particles.len()
    }
    
    /// Update render buffer with current particle positions
    #[wasm_bindgen]
    pub fn update_render_buffer(&mut self) {
        for (i, p) in self.particles.iter().enumerate() {
            let idx = i * 4;
            if idx + 3 < self.render_buffer.len() {
                self.render_buffer[idx] = p.x;
                self.render_buffer[idx + 1] = p.y;
                self.render_buffer[idx + 2] = p.size;
                self.render_buffer[idx + 3] = if p.is_forming { 1.0 } else { 0.0 };
            }
        }
    }
    
    /// Get pointer to render buffer for direct memory access
    #[wasm_bindgen]
    pub fn render_buffer_ptr(&self) -> *const f32 {
        self.render_buffer.as_ptr()
    }
    
    /// Get render buffer length
    #[wasm_bindgen]
    pub fn render_buffer_len(&self) -> usize {
        self.render_buffer.len()
    }
    
    /// Get stats for debugging
    #[wasm_bindgen]
    pub fn get_stats(&self) -> String {
        let forming = self.particles.iter().filter(|p| p.is_forming).count();
        let floating = self.particles.len() - forming;
        format!(
            "particles: {}, forming: {}, floating: {}, text_coords: {}",
            self.particles.len(), forming, floating, self.text_coords.len()
        )
    }
}
