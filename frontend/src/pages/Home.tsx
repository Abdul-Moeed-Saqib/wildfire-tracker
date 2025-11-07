import WildfireMap from '../components/Map/WildfireMap';
import { useFetchEvents } from '../hooks/useFetchEvents';

export default function Home() {
  const { events, loading, error } = useFetchEvents({ status: 'open', limit: 100 });

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Wildfire Tracker</h1>
        <p className="text-sm text-gray-600">Live events from NASA EONET (wildfires)</p>
      </header>

      {loading && <div>Loading wildfire events...</div>}
      {error && <div className="text-red-600">Error loading events: {error.message}</div>}

      <WildfireMap events={events} />
      
      <section className="mt-4">
        <h2 className="font-semibold">Event count</h2>
        <p>{events ? events.length : 0} wildfire events</p>
      </section>
    </div>
  );
}