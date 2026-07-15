# Line Flow

It is a endeless line art built on HTML5 canvas in which agents follow a shifting noise field and dynamic vortices.

## Controls

- Space- Pause or Resume
- R- Rest the board

  <img width="800" height="364" alt="ezgif-48720b19e0c90608" src="https://github.com/user-attachments/assets/06a2baca-23da-41b2-bb82-6610a2a4beae" />


## Mechanics

- Object pooling to keep garbage collection flat
- Spatial density grid to throttle speed in crowded areas
- Time normalization so movement stays consistent

The project is based on endless theme because it uses permanent object pool that recycles agents instead of destroying them which makes sure that the simulation runs forever without memory overflowing.
