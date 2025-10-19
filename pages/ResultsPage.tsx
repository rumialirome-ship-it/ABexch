import React, { useState, useEffect, useCallback } from 'react';
import MainLayout, { LoadingSpinner } from '../components/layout/MainLayout';
import { fetchAllResults } from '../services/api';
import { DrawResult } from '../types';
import { useRealtime } from '../contexts/RealtimeContext';

const ResultsPage: React.FC = () => {
  const [results, setResults] = useState<DrawResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedRows, setHighlightedRows] = useState<Set<string>>(new Set());
  const { subscribe, unsubscribe } = useRealtime();

  useEffect(() => {
    const loadResults = async () => {
      try {
        const data = await fetchAllResults();
        setResults(data.sort((a, b) => new Date(b.declared_at).getTime() - new Date(a.declared_at).getTime()));
      } catch (error) {
        console.error("Failed to fetch results", error);
      } finally {
        setLoading(false);
      }
    };
    loadResults();
  }, []);

  const handleResultUpdate = useCallback((newResult: DrawResult) => {
    setResults(currentResults => {
        if (currentResults.some(r => r.id === newResult.id)) {
            return currentResults;
        }
        return [newResult, ...currentResults];
    });

    setHighlightedRows(prev => new Set(prev).add(newResult.id));
    setTimeout(() => {
        setHighlightedRows(prev => {
            const next = new Set(prev);
            next.delete(newResult.id);
            return next;
        });
    }, 2500);
  }, []);

  useEffect(() => {
      subscribe('result-update', handleResultUpdate);
      return () => {
          unsubscribe('result-update', handleResultUpdate);
      };
  }, [subscribe, unsubscribe, handleResultUpdate]);


  return (
    <MainLayout title="Recent Draw Results" showBackButton titleClassName="text-accent-primary text-shadow-glow-primary">
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-transparent rounded-lg">
            <thead className="border-b-2 border-border-color">
              <tr>
                <th className="py-3 px-4 text-left text-accent-primary font-semibold tracking-wider uppercase text-sm text-shadow-glow-primary">Draw Label</th>
                <th className="py-3 px-4 text-center text-accent-primary font-semibold tracking-wider uppercase text-sm text-shadow-glow-primary">2D</th>
                <th className="py-3 px-4 text-center text-accent-primary font-semibold tracking-wider uppercase text-sm text-shadow-glow-primary">1D Open</th>
                <th className="py-3 px-4 text-center text-accent-primary font-semibold tracking-wider uppercase text-sm text-shadow-glow-primary">1D Close</th>
                <th className="py-3 px-4 text-left text-accent-primary font-semibold tracking-wider uppercase text-sm text-shadow-glow-primary">Declared At</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.id} className={`border-b border-border-color/50 last:border-b-0 hover:bg-accent-primary/5 transition-colors duration-300 ${highlightedRows.has(result.id) ? 'animate-highlight' : ''}`}>
                  <td className="py-4 px-4">{result.draw_label}</td>
                  <td className="py-4 px-4 text-center font-bold text-xl text-text-primary">{result.two_digit}</td>
                  <td className="py-4 px-4 text-center font-bold text-xl text-text-primary">{result.one_digit_open}</td>
                  <td className="py-4 px-4 text-center font-bold text-xl text-text-primary">{result.one_digit_close}</td>
                  <td className="py-4 px-4 text-sm text-text-secondary">{new Date(result.declared_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </MainLayout>
  );
};

export default ResultsPage;
