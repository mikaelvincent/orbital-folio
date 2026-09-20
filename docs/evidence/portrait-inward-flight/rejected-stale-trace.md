# Rejected diagnostic export

The first candidate export was identical to the baseline trace. Vite HMR remounted
the scene at `/contact`, after ordinary navigation had removed `?audit=1` from the
URL. Motion diagnostics were therefore disabled while the old DOM trace attribute
remained. Screenshots showed the new camera, but this trace did not describe it.
It is retained as rejected evidence, not a candidate measurement. Candidate
captures and traces were repeated after a full load of `/?audit=1`.
