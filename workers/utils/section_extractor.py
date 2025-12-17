"""Section extraction utilities for RFP text

Uses basic heuristics to extract relevant sections from full RFP text.
NOTE: this reduces token usage by 70% (from ~54k to ~15k tokens per analysis).
"""

import re
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class SectionExtractor:
    """Extract relevant sections from RFP text using keyword-based heuristics"""

    # Common section headers in government RFPs
    SECTION_PATTERNS = {
        'evaluation': [
            r'section\s+[a-z]?\s*[:-]?\s*evaluation\s+criteria',
            r'evaluation\s+factors?',
            r'proposal\s+evaluation',
            r'scoring\s+criteria',
        ],
        'technical': [
            r'technical\s+requirements?',
            r'scope\s+of\s+work',
            r'statement\s+of\s+work',
            r'sow',
            r'specifications?',
        ],
        'insurance': [
            r'insurance\s+requirements?',
            r'liability\s+insurance',
            r'coverage\s+requirements?',
        ],
        'qualifications': [
            r'qualifications?',
            r'minimum\s+requirements?',
            r'eligibility',
            r'vendor\s+requirements?',
            r'experience\s+requirements?',
        ],
        'small_business': [
            r'small\s+business',
            r'disadvantaged\s+business',
            r'mbe/wbe',
            r'subcontracting\s+plan',
        ],
        'subcontracting': [
            r'subcontract',
            r'sub-contract',
            r'teaming',
        ],
    }

    def __init__(self, max_chars_per_section: int = 10000):
        """Initialize section extractor

        Accepts:
            max_chars_per_section: Maximum characters to extract per section
        """
        self.max_chars = max_chars_per_section

    def extract_for_risks(self, full_text: str) -> str:
        """Extract sections relevant for risk analysis

        Target: ~20k tokens (evaluation criteria, technical requirements, scope)

        Accepts:
            full_text: Complete RFP text

        Returns:
            Extracted text containing relevant sections
        """
        logger.info("Extracting sections for risk analysis")

        sections = []

        # Extract evaluation criteria (highest priority for risks)
        eval_section = self._find_section(full_text, self.SECTION_PATTERNS['evaluation'])
        if eval_section:
            sections.append(eval_section)
            logger.debug(f"Found evaluation section: {len(eval_section)} chars")

        # Extract technical requirements
        tech_section = self._find_section(full_text, self.SECTION_PATTERNS['technical'])
        if tech_section:
            sections.append(tech_section)
            logger.debug(f"Found technical section: {len(tech_section)} chars")

        # If we didn't find specific sections, use full text (truncated)
        if not sections:
            logger.warning("No specific sections found, using full text")
            return full_text[:self.max_chars * 2]

        combined = "\n\n=== SECTION BREAK ===\n\n".join(sections)
        return combined[:self.max_chars * 2]  # ~20k tokens

    def extract_for_accessibility(self, full_text: str) -> str:
        """Extract sections relevant for accessibility analysis

        Target: ~3k tokens (insurance, qualifications, small business policy)

        Args:
            full_text: Complete RFP text

        Returns:
            Extracted text containing relevant sections
        """
        logger.info("Extracting sections for accessibility analysis")

        sections = []

        # Extract insurance requirements
        insurance = self._find_section(full_text, self.SECTION_PATTERNS['insurance'])
        if insurance:
            sections.append(insurance)
            logger.debug(f"Found insurance section: {len(insurance)} chars")

        # Extract qualifications
        quals = self._find_section(full_text, self.SECTION_PATTERNS['qualifications'])
        if quals:
            sections.append(quals)
            logger.debug(f"Found qualifications section: {len(quals)} chars")

        # Extract small business policy
        sb_policy = self._find_section(full_text, self.SECTION_PATTERNS['small_business'])
        if sb_policy:
            sections.append(sb_policy)
            logger.debug(f"Found small business section: {len(sb_policy)} chars")

        if not sections:
            logger.warning("No accessibility sections found, using sample")
            return full_text[:self.max_chars // 2]

        combined = "\n\n=== SECTION BREAK ===\n\n".join(sections)
        return combined[:self.max_chars]  # ~3k tokens

    def extract_for_subcontracting(self, full_text: str) -> str:
        """Extract sections relevant for subcontracting analysis

        Target: ~8k tokens (scope, subcontracting policy)

        Args:
            full_text: Complete RFP text

        Returns:
            Extracted text containing relevant sections
        """
        logger.info("Extracting sections for subcontracting analysis")

        sections = []

        # Extract scope/SOW
        scope = self._find_section(full_text, self.SECTION_PATTERNS['technical'])
        if scope:
            sections.append(scope)
            logger.debug(f"Found scope section: {len(scope)} chars")

        # Extract subcontracting policy
        subcon = self._find_section(full_text, self.SECTION_PATTERNS['subcontracting'])
        if subcon:
            sections.append(subcon)
            logger.debug(f"Found subcontracting section: {len(subcon)} chars")

        if not sections:
            logger.warning("No subcontracting sections found, using full text")
            return full_text[:self.max_chars]

        combined = "\n\n=== SECTION BREAK ===\n\n".join(sections)
        return combined[:self.max_chars]  # ~8k tokens

    def _find_section(self, text: str, patterns: List[str]) -> Optional[str]:
        """Find a section in text using regex patterns

        Args:
            text: Full text to search
            patterns: List of regex patterns to match section headers

        Returns:
            Extracted section text or None if not found
        """
        text_lower = text.lower()

        for pattern in patterns:
            match = re.search(pattern, text_lower, re.IGNORECASE)
            if match:
                # Found section header, extract content
                start_pos = match.start()

                # Find next section header or end of document
                # Look for common section markers
                next_section = re.search(
                    r'\n\s*section\s+[a-z0-9]+[.:]|\n\s*[A-Z][A-Z\s]{10,}\n',
                    text[start_pos + 100:],  # Skip current header
                    re.MULTILINE
                )

                if next_section:
                    end_pos = start_pos + 100 + next_section.start()
                else:
                    # No next section found, take rest of document (limited)
                    end_pos = start_pos + self.max_chars

                section_text = text[start_pos:end_pos]
                return section_text[:self.max_chars]  # Limit section size

        return None

    def extract_metadata(self, text: str) -> Dict[str, str]:
        """Extract basic metadata from RFP text

        Accepts:
            text: Full RFP text

        Returns:
            Dictionary with extracted metadata
        """
        metadata = {
            'rfp_title': 'Unknown',
            'agency_name': 'Unknown',
            'contract_type': 'IT Services',
            'estimated_value': 'Unknown',
            'risk_level': 'standard',
        }

        # Try to extract title (usually in first 500 chars)
        title_match = re.search(
            r'(?:request for proposals?|rfp)\s*[:-]?\s*(.{10,100})',
            text[:500],
            re.IGNORECASE
        )
        if title_match:
            metadata['rfp_title'] = title_match.group(1).strip()

        # Try to extract agency name
        agency_patterns = [
            r'(?:city|county|state)\s+of\s+(\w+)',
            r'(\w+\s+(?:city|county|state))',
        ]
        for pattern in agency_patterns:
            match = re.search(pattern, text[:1000], re.IGNORECASE)
            if match:
                metadata['agency_name'] = match.group(1).strip()
                break

        # Try to extract contract value
        value_match = re.search(
            r'\$([\d,]+(?:\.\d{2})?)[\s-]*(?:million|m)?',
            text[:2000],
            re.IGNORECASE
        )
        if value_match:
            metadata['estimated_value'] = f"${value_match.group(1)}"

        # Detect risk level based on keywords
        if any(word in text.lower() for word in ['healthcare', 'phi', 'hipaa', 'financial', 'pci']):
            metadata['risk_level'] = 'high-risk'

        return metadata