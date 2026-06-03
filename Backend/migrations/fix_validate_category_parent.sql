-- ============================================================================
-- Migration: Fix validate_category_parent trigger
-- Problem: The trigger prevents creating subcategories under global categories
--          because NULL (global user_id) IS DISTINCT FROM any UUID is always TRUE.
-- Fix: Add check "AND p.user_id IS NOT NULL" before comparing ownership scope
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_category_parent()
RETURNS TRIGGER AS $$
DECLARE
  p RECORD;
BEGIN
  IF NEW.parent_category_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_category_id = NEW.category_id THEN
    RAISE EXCEPTION 'A category cannot be its own parent';
  END IF;

  SELECT user_id, type INTO p
  FROM categories
  WHERE category_id = NEW.parent_category_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent category % not found', NEW.parent_category_id;
  END IF;

  IF p.type <> NEW.type THEN
    RAISE EXCEPTION 'Sub-category type (%) must match parent type (%)', NEW.type, p.type;
  END IF;

  -- FIXED: Allow subcategories under global categories (user_id IS NULL)
  -- Only check ownership if parent belongs to a specific user
  IF p.user_id IS NOT NULL AND (p.user_id IS DISTINCT FROM NEW.user_id) THEN
    RAISE EXCEPTION 'Sub-category must share the same ownership scope with parent';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;