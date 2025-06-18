// src/App.js
import React, { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronRight, Target, Package, User, Settings, Check, Trash2, Download, Upload, Save, Cloud, CloudOff } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = 'https://uugjplzvpkejuzsqfntt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1Z2pwbHp2cGtlanV6c3FmbnR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNjE0MDksImV4cCI6MjA2NTczNzQwOX0.lxq42WEyjZYB9N_oIpSgKEwJj3uY23tO9154LmEpmWE'; // Remplacez par votre clé publique
const supabase = createClient(supabaseUrl, supabaseKey);

const DofusObjectivesTracker = () => {
  const [objectives, setObjectives] = useState([

  ]);

  const [newObjective, setNewObjective] = useState({
    title: '',
    type: 'level',
    priority: 'medium',
    currentValue: 0,
    targetValue: 100
  });

  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [userId, setUserId] = useState('demo-user'); // Remplacez par votre système d'auth
  const [loading, setLoading] = useState(false);

  // Fonctions Supabase
  const saveToSupabase = async (objectivesToSave) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dofus_objectives')
        .upsert({
          user_id: userId,
          data: { objectives: objectivesToSave },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Erreur sauvegarde Supabase:', error);
        setIsOnline(false);
        return false;
      }

      setIsOnline(true);
      setLastSaved(new Date());
      return true;
    } catch (error) {
      console.error('Erreur connexion Supabase:', error);
      setIsOnline(false);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loadFromSupabase = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dofus_objectives')
        .select('data, updated_at')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Erreur chargement Supabase:', error);
        setIsOnline(false);
        return null;
      }

      if (data && data.data && data.data.objectives) {
        setIsOnline(true);
        setLastSaved(new Date(data.updated_at));
        return data.data.objectives;
      }

      return null;
    } catch (error) {
      console.error('Erreur connexion Supabase:', error);
      setIsOnline(false);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarde automatique
  useEffect(() => {
    if (autoSaveEnabled && isOnline) {
      const saveTimer = setTimeout(() => {
        saveToSupabase(objectives);
      }, 2000); // Sauvegarde après 2 secondes d'inactivité

      return () => clearTimeout(saveTimer);
    }
  }, [objectives, autoSaveEnabled, isOnline]);

  // Chargement initial
  useEffect(() => {
    const loadData = async () => {
      const savedObjectives = await loadFromSupabase();
      if (savedObjectives && savedObjectives.length > 0) {
        setObjectives(savedObjectives);
      }
    };
    loadData();
  }, []);

  // Sauvegarde manuelle
  const manualSave = async () => {
    const success = await saveToSupabase(objectives);
    if (success) {
      alert('Données sauvegardées avec succès !');
    } else {
      alert('Erreur lors de la sauvegarde. Vérifiez votre connexion.');
    }
  };

  // Export des données
  const exportData = () => {
    const data = {
      objectives,
      exportDate: new Date().toISOString(),
      version: "1.0"
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dofus-objectives-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import des données
  const importData = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.objectives) {
            setObjectives(data.objectives);
            saveToSupabase(data.objectives);
            alert('Données importées avec succès !');
          }
        } catch (error) {
          alert('Erreur lors de l\'import du fichier');
        }
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  const toggleObjective = (id) => {
    setObjectives(prev => prev.map(obj =>
      obj.id === id ? { ...obj, expanded: !obj.expanded } : obj
    ));
  };

  const addObjective = () => {
    if (newObjective.title.trim()) {
      const newObj = {
        id: Date.now(),
        ...newObjective,
        completed: false,
        progress: 0,
        expanded: false,
        subObjectives: [],
        resources: []
      };
      setObjectives(prev => [...prev, newObj]);
      setNewObjective({ title: '', type: 'level', priority: 'medium', currentValue: 0, targetValue: 100 });
      setShowAddForm(false);
    }
  };

  const addSubObjective = (parentId, title) => {
    if (title.trim()) {
      setObjectives(prev => prev.map(obj =>
        obj.id === parentId
          ? {
            ...obj,
            subObjectives: [...obj.subObjectives, {
              id: Date.now(),
              title,
              completed: false,
              progress: 0
            }]
          }
          : obj
      ));
    }
  };

  const addResource = (parentId, name, needed) => {
    if (name.trim() && needed > 0) {
      setObjectives(prev => prev.map(obj =>
        obj.id === parentId
          ? {
            ...obj,
            resources: [...obj.resources, {
              id: Date.now(),
              name,
              needed: parseInt(needed),
              current: 0,
              crafted: false
            }]
          }
          : obj
      ));
    }
  };

  const updateResourceCurrent = (objId, resourceId, current) => {
    setObjectives(prev => prev.map(obj =>
      obj.id === objId
        ? {
          ...obj,
          resources: obj.resources.map(res =>
            res.id === resourceId
              ? { ...res, current: parseInt(current) || 0 }
              : res
          )
        }
        : obj
    ));
  };

  const toggleCompleted = (objId, subId = null) => {
    setObjectives(prev => prev.map(obj => {
      if (obj.id === objId) {
        if (subId) {
          return {
            ...obj,
            subObjectives: obj.subObjectives.map(sub =>
              sub.id === subId
                ? { ...sub, completed: !sub.completed, progress: sub.completed ? 0 : 100 }
                : sub
            )
          };
        } else {
          return { ...obj, completed: !obj.completed, progress: obj.completed ? 0 : 100 };
        }
      }
      return obj;
    }));
  };


  // Méthode 1: Suppression directe avec confirmation
  const deleteSubObjective = (objId, subObjId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce sous-objectif ?')) {
      setObjectives(prev => prev.map(obj =>
        obj.id === objId
          ? {
            ...obj,
            subObjectives: obj.subObjectives.filter(sub => sub.id !== subObjId)
          }
          : obj
      ));
    }
  };

  // Méthode 2: Modification du titre d'un sous-objectif
  const editSubObjective = (objId, subObjId, newTitle) => {
    if (newTitle && newTitle.trim()) {
      setObjectives(prev => prev.map(obj =>
        obj.id === objId
          ? {
            ...obj,
            subObjectives: obj.subObjectives.map(sub =>
              sub.id === subObjId
                ? { ...sub, title: newTitle.trim() }
                : sub
            )
          }
          : obj
      ));
    }
  };

  // === MÉTHODES POUR MODIFIER LA QUANTITÉ DES RESSOURCES ===

  // Méthode 1: Modification de la quantité nécessaire
  const updateResourceNeeded = (objId, resourceId, newNeeded) => {
    const needed = parseInt(newNeeded) || 0;
    if (needed > 0) {
      setObjectives(prev => prev.map(obj =>
        obj.id === objId
          ? {
            ...obj,
            resources: obj.resources.map(res =>
              res.id === resourceId
                ? { ...res, needed: needed }
                : res
            )
          }
          : obj
      ));
    }
  };

  // Méthode 2: Suppression d'une ressource
  const deleteResource = (objId, resourceId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette ressource ?')) {
      setObjectives(prev => prev.map(obj =>
        obj.id === objId
          ? {
            ...obj,
            resources: obj.resources.filter(res => res.id !== resourceId)
          }
          : obj
      ));
    }
  };
  // Fonction pour mettre à jour la valeur actuelle d'un objectif
  const updateCurrentValue = (objId, newValue) => {
    const value = parseInt(newValue) || 0;
    setObjectives(prev => prev.map(obj => {
      if (obj.id === objId) {
        const updatedObj = { ...obj, currentValue: value };
        // Recalcul automatique du pourcentage
        if (updatedObj.targetValue > 0) {
         updatedObj.progress = Math.round(Math.min((value / updatedObj.targetValue) * 100, 100) * 100) / 100;

        }
        return updatedObj;
      }
      return obj;
    }));
  };

  // Fonction pour mettre à jour la valeur cible d'un objectif
  const updateTargetValue = (objId, newValue) => {
    const value = parseInt(newValue) || 1;
    if (value > 0) {
      setObjectives(prev => prev.map(obj => {
        if (obj.id === objId) {
          const updatedObj = { ...obj, targetValue: value };
          // Recalcul automatique du pourcentage
          if (updatedObj.currentValue !== undefined) {
           updatedObj.progress = Math.round(Math.min((updatedObj.currentValue / value) * 100, 100) * 100) / 100;

          }
          return updatedObj;
        }
        return obj;
      }));
    }
  };

  const SubObjectiveItem = ({ objective, subObj }) => (
    <div key={subObj.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
      <div className="flex items-center gap-3 flex-1">
        <span className={`${subObj.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
          {subObj.title}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-24 bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-green-500 h-1.5 rounded-full"
            style={{ width: `${subObj.progress}%` }}
          ></div>
        </div>
        <button
          onClick={() => toggleCompleted(objective.id, subObj.id)}
          className={`p-1 rounded ${subObj.completed
            ? 'bg-green-100 text-green-600'
            : 'bg-gray-100 text-gray-600'
            }`}
        >
          <Check className="w-3 h-3" />
        </button>
        {/* Nouveau bouton d'édition */}
        <button
          onClick={() => {
            const newTitle = prompt('Nouveau titre:', subObj.title);
            if (newTitle !== null) editSubObjective(objective.id, subObj.id, newTitle);
          }}
          className="p-1 rounded bg-blue-100 text-blue-600 hover:bg-blue-200"
          title="Modifier"
        >
          <Settings className="w-3 h-3" />
        </button>
        {/* Nouveau bouton de suppression */}
        <button
          onClick={() => deleteSubObjective(objective.id, subObj.id)}
          className="p-1 rounded bg-red-100 text-red-600 hover:bg-red-200"
          title="Supprimer"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );

  // Modification de l'affichage des ressources avec champs éditables
  const ResourceItem = ({ objective, resource }) => (
    <div key={resource.id} className="flex flex-wrap items-center justify-between bg-blue-50 p-3 rounded-lg">
      <div className="flex items-center gap-3 flex-1">
        <Package className="w-4 h-4 text-blue-600" />
        <span className="text-gray-700">{resource.name}</span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="number"
          defaultValue={resource.current}
          onBlur={(e) => updateResourceCurrent(objective.id, resource.id, e.target.value)}
          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
          min="0"
          placeholder="Actuel"
        />
        <span className="text-sm text-gray-600">/</span>
        {/* Champ éditable pour la quantité nécessaire avec onBlur */}
        <input
          type="number"
          defaultValue={resource.needed}
          onBlur={(e) => updateResourceNeeded(objective.id, resource.id, e.target.value)}
          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
          min="1"
          title="Quantité nécessaire"
          placeholder="Nécessaire"
        />
        <div className="w-20 bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-blue-500 h-1.5 rounded-full"
            style={{ width: `${Math.min((resource.current / resource.needed) * 100, 100)}%` }}
          ></div>
        </div>
        {/* Bouton de suppression */}
        <button
          onClick={() => deleteResource(objective.id, resource.id)}
          className="p-1 rounded bg-red-100 text-red-600 hover:bg-red-200 ml-2"
          title="Supprimer la ressource"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
  const deleteObjective = (id) => {
    setObjectives(prev => prev.filter(obj => obj.id !== id));
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'level': return <User className="w-4 h-4" />;
      case 'farming': return <Target className="w-4 h-4" />;
      case 'crafting': return <Settings className="w-4 h-4" />;
      case 'profession': return <Package className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <Target className="w-8 h-8 text-blue-600" />
                  Gestionnaire d'Objectifs Dofus
                </h1>
                <p className="text-gray-600 mt-2">Suivez vos objectifs et ressources pour votre équipe de 8 personnages</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-2">
                    {isOnline ? (
                      <Cloud className="w-4 h-4 text-green-600" />
                    ) : (
                      <CloudOff className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`text-xs ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                      {isOnline ? 'En ligne' : 'Hors ligne'}
                    </span>
                  </div>

                  {lastSaved && (
                    <p className="text-xs text-gray-500">
                      Dernière sauvegarde: {lastSaved.toLocaleTimeString()}
                    </p>
                  )}

                  <div className="flex  items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      id="autosave"
                      checked={autoSaveEnabled}
                      onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <label htmlFor="autosave" className="text-sm text-gray-600">
                      Sauvegarde auto
                    </label>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={manualSave}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>

                  <button
                    onClick={exportData}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Exporter
                  </button>

                  <label className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors cursor-pointer text-sm">
                    <Upload className="w-4 h-4" />
                    Importer
                    <input
                      type="file"
                      accept=".json"
                      onChange={importData}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mb-6"
            >
              <Plus className="w-4 h-4" />
              Nouvel Objectif
            </button>

            {showAddForm && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Titre de l'objectif"
                    value={newObjective.title}
                    onChange={(e) => setNewObjective(prev => ({ ...prev, title: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <select
                    value={newObjective.type}
                    onChange={(e) => setNewObjective(prev => ({ ...prev, type: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="level">Montée de niveau</option>
                    <option value="farming">Farm</option>
                    <option value="crafting">Craft</option>
                    <option value="profession">Métier</option>
                  </select>
                  <select
                    value={newObjective.priority}
                    onChange={(e) => setNewObjective(prev => ({ ...prev, priority: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="high">Priorité haute</option>
                    <option value="medium">Priorité moyenne</option>
                    <option value="low">Priorité basse</option>
                  </select>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="number"
                      placeholder="Valeur actuelle"
                      value={newObjective.currentValue}
                      onChange={(e) => setNewObjective(prev => ({ ...prev, currentValue: parseInt(e.target.value) || 0 }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent flex-1"
                      min="0"
                    />
                    <span className="flex items-center text-gray-500">/</span>
                    <input
                      type="number"
                      placeholder="Valeur cible"
                      value={newObjective.targetValue}
                      onChange={(e) => setNewObjective(prev => ({ ...prev, targetValue: parseInt(e.target.value) || 100 }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent flex-1"
                      min="1"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={addObjective}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Ajouter
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {objectives.map(objective => (
                <div key={objective.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="p-4">
                    <div className="flex flex-wrap gap-2 items-center justify-between">
                      <div className="flex flex-wrap items-center gap-3 flex-1">
                        <button
                          onClick={() => toggleObjective(objective.id)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {objective.expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </button>

                        <div className="flex items-center gap-2">
                          {getTypeIcon(objective.type)}
                          <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(objective.priority)}`}>
                            {objective.priority === 'high' ? 'Haute' : objective.priority === 'medium' ? 'Moyenne' : 'Basse'}
                          </span>
                        </div>

                        <div className="flex-1 ">
                          <h3 className={`font-semibold ${objective.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {objective.title}
                          </h3>
                          <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={objective.currentValue || 0}
                                onChange={(e) => updateCurrentValue(objective.id, e.target.value)}
                                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                min="0"
                                title="Valeur actuelle"
                              />
                              <span className="text-sm text-gray-600">/</span>
                              <input
                                type="number"
                                value={objective.targetValue || 100}
                                onChange={(e) => updateTargetValue(objective.id, e.target.value)}
                                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                min="1"
                                title="Valeur cible"
                              />
                            </div>
                          
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${objective.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-12">{objective.progress}%</span>
                        </div>

                        <button
                          onClick={() => toggleCompleted(objective.id)}
                          className={`p-2 rounded-lg transition-colors ${objective.completed
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                          <Check className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => deleteObjective(objective.id)}
                          className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {objective.expanded && (
                      <div className="mt-4 pl-4 space-y-4">
                        {/* Sous-objectifs */}
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">Sous-objectifs</h4>
                          <div className="space-y-2">
                            {objective.subObjectives.map(subObj => (
                              <SubObjectiveItem
                                key={subObj.id}
                                objective={objective}
                                subObj={subObj}
                              />
                            ))}
                            <button
                              onClick={() => {
                                const title = prompt('Titre du sous-objectif:');
                                if (title) addSubObjective(objective.id, title);
                              }}
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                            >
                              <Plus className="w-3 h-3" />
                              Ajouter un sous-objectif
                            </button>
                          </div>
                        </div>

                        {/* Ressources */}
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">Ressources nécessaires</h4>
                          <div className="space-y-2">
                            {objective.resources.map(resource => (
                              <ResourceItem
                                key={resource.id}
                                objective={objective}
                                resource={resource}
                              />
                            ))}
                            <button
                              onClick={() => {
                                const name = prompt('Nom de la ressource:');
                                const needed = prompt('Quantité nécessaire:');
                                if (name && needed) addResource(objective.id, name, needed);
                              }}
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                            >
                              <Plus className="w-3 h-3" />
                              Ajouter une ressource
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistiques</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900">Total Objectifs</h3>
              <p className="text-2xl font-bold text-blue-600">{objectives.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-900">Complétés</h3>
              <p className="text-2xl font-bold text-green-600">
                {objectives.filter(obj => obj.completed).length}
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="font-medium text-orange-900">En cours</h3>
              <p className="text-2xl font-bold text-orange-600">
                {objectives.filter(obj => !obj.completed).length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DofusObjectivesTracker;