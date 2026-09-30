import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { adminService } from '../services/adminService';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Refresh2, Cup, Profile2User, Calendar, Activity, ShieldTick } from 'iconsax-react';

export const TeamLeagueControlPage = () => {
  const [leagues, setLeagues] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const selectedLeague = useMemo(
    () => leagues.find((league) => league.id === selectedId) || leagues[0] || null,
    [leagues, selectedId],
  );

  const loadLeagues = async () => {
    setLoading(true);
    try {
      const rows = await adminService.fetchTeamLeagues();
      setLeagues(rows || []);
      setSelectedId((current) => {
        if (current && (rows || []).some((league) => league.id === current)) return current;
        return rows?.[0]?.id || null;
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (leagueId) => {
    if (!leagueId) {
      setMatches([]);
      setStandings([]);
      return;
    }
    setDetailsLoading(true);
    try {
      const [matchRows, standingRows] = await Promise.all([
        adminService.fetchTournamentMatches(leagueId),
        adminService.fetchTeamLeagueStandings(leagueId),
      ]);
      setMatches(matchRows || []);
      setStandings(standingRows || []);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    loadLeagues();
  }, []);

  useEffect(() => {
    loadDetails(selectedLeague?.id);
  }, [selectedLeague?.id]);

  useEffect(() => {
    const channel = supabase
      .channel('admin_team_league_control_' + Date.now())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'championships' },
        (payload) => {
          const row = payload.new || payload.old || {};
          if (row.template_type === 'team_league') loadLeagues();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournament_matches' },
        (payload) => {
          const row = payload.new || payload.old || {};
          if (row.championship_id === selectedLeague?.id) loadDetails(selectedLeague.id);
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [selectedLeague?.id]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[360px]">
        <Refresh2 className="w-8 h-8 text-vsp-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Cup className="w-6 h-6 text-vsp-accent" />
            دوري الفرق
          </h1>
          <p className="text-xs text-vsp-textSecondary mt-1">
            متابعة دوريات الفرق الخاصة، المباريات والجدول من نفس مصدر البيانات في Supabase.
          </p>
        </div>
        <button
          onClick={loadLeagues}
          className="p-2.5 bg-vsp-surface hover:bg-vsp-card border border-vsp-border rounded-xl text-vsp-textSecondary hover:text-white"
          title="تحديث"
        >
          <Refresh2 className="w-4 h-4" />
        </button>
      </div>

      {leagues.length === 0 ? (
        <EmptyState
          title="لا توجد دوريات فرق حالياً"
          description="سيظهر هنا أي دوري منشأ من تطبيق VSP بعد تسجيله في Supabase."
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-5">
          <div className="bg-vsp-surface border border-vsp-border rounded-2xl p-4 space-y-2">
            <div className="text-xs font-black text-white mb-2">الدوريات</div>
            {leagues.map((league) => {
              const active = selectedLeague?.id === league.id;
              const teamCount = Array.isArray(league.joined_teams) ? league.joined_teams.length : 0;
              return (
                <button
                  key={league.id}
                  onClick={() => setSelectedId(league.id)}
                  className={
                    'w-full text-right p-3 rounded-xl border transition-all ' +
                    (active
                      ? 'bg-vsp-accent/10 border-vsp-accent/40'
                      : 'bg-vsp-card/30 border-vsp-border hover:border-vsp-accent/30')
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-white text-xs">{league.name || 'دوري فرق'}</span>
                    <Badge>{league.status || 'open'}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-vsp-textSecondary mt-2">
                    <span>{teamCount}/{league.max_teams || 4} فرق</span>
                    <span>{league.governorate || '-'}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-5">
            <div className="bg-vsp-surface border border-vsp-border rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldTick className="w-5 h-5 text-vsp-accent" />
                    <h2 className="text-lg font-black text-white">{selectedLeague?.name}</h2>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-vsp-textSecondary mt-2">
                    <span>الحالة: {selectedLeague?.status || '-'}</span>
                    <span>الفرق: {selectedLeague?.joined_teams?.length || 0}/{selectedLeague?.max_teams || 4}</span>
                    <span>الفترة: {selectedLeague?.match_interval_days || 7} أيام</span>
                  </div>
                </div>
                <div className="text-[11px] text-vsp-textSecondary">
                  هذا القسم للمتابعة فقط؛ التغييرات المالية وحالة الدوري تبقى عبر المسارات الذرية.
                </div>
              </div>
            </div>

            <div className="bg-vsp-surface border border-vsp-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Profile2User className="w-5 h-5 text-vsp-accent" />
                <h3 className="font-black text-white">الترتيب</h3>
              </div>
              {detailsLoading ? (
                <Refresh2 className="w-5 h-5 text-vsp-accent animate-spin" />
              ) : standings.length === 0 ? (
                <div className="text-xs text-vsp-textSecondary">لا توجد نتائج مؤكدة بعد.</div>
              ) : (
                <div className="space-y-2">
                  {standings.map((row) => (
                    <div key={row.team_id} className="flex items-center justify-between p-3 bg-vsp-card/30 rounded-xl border border-vsp-border">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-vsp-accent">#{row.rank}</span>
                        <span className="text-xs font-bold text-white">{row.team_name}</span>
                      </div>
                      <div className="text-[11px] text-vsp-textSecondary">
                        {row.played} لعب • {row.won} فوز • {row.drawn} تعادل • {row.lost} خسارة • {row.points} نقطة
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-vsp-surface border border-vsp-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-vsp-accent" />
                <h3 className="font-black text-white">المباريات</h3>
              </div>
              {detailsLoading ? (
                <Refresh2 className="w-5 h-5 text-vsp-accent animate-spin" />
              ) : matches.length === 0 ? (
                <div className="text-xs text-vsp-textSecondary">لم يتم توليد مباريات بعد.</div>
              ) : (
                <div className="space-y-2">
                  {matches.map((match) => (
                    <div key={match.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-3 bg-vsp-card/30 rounded-xl border border-vsp-border">
                      <span className="text-xs font-bold text-white">{match.home_team_name || match.home_team_id || 'الفريق المضيف'}</span>
                      <div className="text-center">
                        <div className="text-[10px] text-vsp-textSecondary">الأسبوع {match.week_number ?? match.round_index}</div>
                        <div className="text-xs font-black text-vsp-accent">
                          {match.confirmed_outcome || match.result_status || match.status || 'مجدولة'}
                        </div>
                        <div className="text-[10px] text-vsp-textSecondary mt-1">
                          {match.match_day || match.scheduled_time || '-'}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-white text-left">{match.away_team_name || match.away_team_id || 'الفريق الضيف'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-vsp-textSecondary">
              <Activity className="w-4 h-4" />
              البيانات المعروضة من Supabase مباشرة، مع تحديث لحظي للمباريات والدوريات.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
