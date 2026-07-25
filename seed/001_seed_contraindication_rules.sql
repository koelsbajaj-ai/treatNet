-- Deterministic contraindication gate rules (PLAN.md section 2).
-- Illustrative codes, not clinically verified.

insert into treatment_contraindication_rules (id, treatment_code, rule_type, parameter_code, operator, threshold_value, reason) values
  ('68a0bbbe-d280-3971-c63d-c6b5de65d9b5', '224905', 'allergy', '224905', null, null, 'Documented allergy to trastuzumab'),
  ('4a962fae-2708-840e-2ab2-6d8cf1c18391', '224905', 'observation_threshold', '10230-1', '<', 50, 'Contraindicated with reduced ejection fraction (cardiotoxicity risk)'),
  ('373cfd9f-8d61-80bf-d3f9-941381d0ce17', '6809', 'observation_threshold', '33914-3', '<', 30, 'Contraindicated in severe renal impairment (eGFR < 30)'),
  ('a3befe94-1a89-e290-4edc-83317281d8c2', '4603', 'allergy', 'SULFA-CLASS', null, null, 'Cross-reactive allergy risk with sulfonamide-derived diuretics');
